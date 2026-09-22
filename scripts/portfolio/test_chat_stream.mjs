import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';

async function load(file) {
  const code = ts.transpileModule(await fs.readFile(file, 'utf8'), { compilerOptions:{ module:ts.ModuleKind.ESNext, target:ts.ScriptTarget.ES2022 } }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
}
const { readAnswerStream } = await load('src/concepts/practice/chat/stream.ts');
const { createChatHandler } = await load('supabase/functions/chat/handler.ts');
const { citedSources } = await load('src/concepts/practice/chat/citations.ts');
const encoder = new TextEncoder();
const delta = text => `data: ${JSON.stringify({ choices:[{ delta:{ content:text } }] })}\r\n\r\n`;
const end = 'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}\r\n\r\ndata: [DONE]\r\n\r\n';
const sse = body => new Response(body, { headers:{ 'Content-Type':'text/event-stream' } });
function chunked(text, sizes) {
  const bytes = encoder.encode(text); let offset = 0, step = 0;
  return new ReadableStream({ pull(c) { if (offset === bytes.length) { c.close(); return; } const size = sizes[step++ % sizes.length]; c.enqueue(bytes.slice(offset, offset + size)); offset = Math.min(offset + size, bytes.length); } });
}

test('SSE survives byte-at-a-time UTF-8, CRLF and event boundaries', async () => {
  const updates = [], expected = 'Will’s work — design, RAG, and care. 🧭';
  const body = ': heartbeat\r\n\r\n' + delta('Will’s work — ') + delta('design, RAG, and care. 🧭') + end;
  assert.equal(await readAnswerStream(sse(chunked(body, [1,2,7,3])), new AbortController().signal, t => updates.push(t)), expected);
  assert.equal(updates.length, 2); assert.equal(updates[0], 'Will’s work — ');
});
test('tokens become readable before the upstream response completes', async () => {
  let upstream;
  const body = new ReadableStream({ start(c) { upstream = c; } });
  const received = [];
  const result = readAnswerStream(sse(body), new AbortController().signal, text => received.push(text));
  upstream.enqueue(encoder.encode(delta('A partial answer')));
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.deepEqual(received, ['A partial answer']);
  upstream.enqueue(encoder.encode(delta(' and its ending.') + end)); upstream.close();
  assert.equal(await result, 'A partial answer and its ending.');
});
test('cancel stops an open reader, and partial content remains available', async () => {
  let cancelled = false;
  const abort = new AbortController(); const received = [];
  const body = new ReadableStream({ start(c) { c.enqueue(encoder.encode(delta('Keep this text.'))); }, cancel() { cancelled = true; } });
  const result = readAnswerStream(sse(body), abort.signal, text => received.push(text));
  await new Promise(resolve => setTimeout(resolve, 10)); abort.abort('stopped');
  await assert.rejects(result); assert.equal(cancelled, true); assert.deepEqual(received, ['Keep this text.']);
});
test('a broken or truncated stream is not silently marked complete', async () => {
  for (const body of [delta('Partial'), delta('Partial') + 'data: {broken}\n\n', delta('Partial') + 'data: {"error":{"message":"failed"}}\n\n', delta('Partial') + 'data: {"choices":[{"delta":{},"finish_reason":"length"}]}\n\ndata: [DONE]\n\n']) {
    await assert.rejects(readAnswerStream(sse(chunked(body, [5])), new AbortController().signal, () => {}));
  }
});
test('old JSON responses remain usable without simulated streaming', async () => {
  const updates = [];
  const result = await readAnswerStream(new Response(JSON.stringify({ generatedText:'An existing answer.' }), { headers:{ 'Content-Type':'application/json' } }), new AbortController().signal, t => updates.push(t));
  assert.equal(result, 'An existing answer.'); assert.deepEqual(updates, ['An existing answer.']);
});
test('rail includes only complete, allowed citations, in answer order', () => {
  const sources = [{ id:'a', url:'/practice.html#case=abc' }, { id:'b', url:'https://medium.com/@willdzierson/essay' }];
  const partial = '[Project](/practice.html#case=ab'; assert.deepEqual(citedSources(partial, sources), []);
  const text = 'A mentioned project. [Essay](https://medium.com/@willdzierson/essay) [Project](#case=abc) [Again](#case=abc) [Fake](https://evil.example/#case=abc) ![Image](#case=abc)';
  assert.deepEqual(citedSources(text, sources).map(s => s.id), ['b','a']);
  assert.deepEqual(citedSources('`[Code](#case=abc)`\n```\n[Code](#case=abc)\n```', sources), []);
});
test('edge handler keeps legacy JSON and forwards opt-in SSE incrementally', async () => {
  const requests = []; let upstream;
  const handler = createChatHandler('test-key', async (_url, options) => {
    const body = JSON.parse(options.body); requests.push(body);
    if (!body.stream) return Response.json({ choices:[{ message:{ content:'Legacy terminal response.' } }] });
    return sse(new ReadableStream({ start(c) { upstream = c; } }));
  });
  const request = stream => new Request('https://local.test/chat', { method:'POST', body:JSON.stringify({ messages:[{ role:'user', content:'Question' }], ...(stream ? { stream:true } : {}) }) });
  const legacy = await handler(request(false)); assert.deepEqual(await legacy.json(), { generatedText:'Legacy terminal response.' });
  const response = await handler(request(true)); assert.match(response.headers.get('content-type'), /text\/event-stream/);
  const updates = [], answer = readAnswerStream(response, new AbortController().signal, t => updates.push(t));
  upstream.enqueue(encoder.encode(delta('Live text'))); await new Promise(resolve => setTimeout(resolve, 10)); assert.deepEqual(updates, ['Live text']);
  upstream.enqueue(encoder.encode(end)); upstream.close(); assert.equal(await answer, 'Live text');
  assert.equal(requests[0].stream, false); assert.equal(requests[1].stream, true); assert.equal(requests[1].model, 'gpt-4o-mini');
});
test('edge handler handles preflight, invalid input and upstream errors without leaking details', async () => {
  let called = false;
  const handler = createChatHandler('test-key', async () => { called = true; return new Response('private upstream detail', { status:429 }); });
  const request = body => new Request('https://local.test/chat', { method:'POST', body });
  assert.equal((await handler(new Request('https://local.test/chat', { method:'OPTIONS' }))).status, 200);
  assert.equal((await handler(request('{broken'))).status, 400);
  assert.equal((await handler(request('{}'))).status, 400); assert.equal(called, false);
  const result = await handler(request(JSON.stringify({ messages:[{ role:'user', content:'Question' }] })));
  assert.equal(result.status, 429); assert.doesNotMatch(await result.text(), /private|test-key/);
});
test('edge stream cancellation reaches the upstream body', async () => {
  let cancelled = false;
  const handler = createChatHandler('test-key', async () => sse(new ReadableStream({ cancel() { cancelled = true; } })));
  const response = await handler(new Request('https://local.test/chat', { method:'POST', body:JSON.stringify({ stream:true, messages:[{ role:'user', content:'Question' }] }) }));
  const reader = response.body.getReader(); await reader.cancel('Visitor stopped the answer.'); reader.releaseLock();
  assert.equal(cancelled, true);
});
