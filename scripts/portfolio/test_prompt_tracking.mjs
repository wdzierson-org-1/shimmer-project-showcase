import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';

const require = createRequire(import.meta.url);
function load(file, mocks = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(name => {
    if (name in mocks) return mocks[name];
    if (name.endsWith('.css')) return {};
    return require(name);
  }, module, module.exports);
  return module.exports;
}

// Exercise the real submission callbacks, stream reader, and persistence service.
// Hooks retain state across renders; layout effects are unnecessary without a DOM.
function conversation() {
  const rows = [], slots = [], cleanups = [];
  let cursor = 0, mounted = false;
  const { RateLimiter } = load('src/utils/inputValidation.ts');
  const tracking = load('src/services/promptTrackingService.ts', {
    '@/integrations/supabase/client': { supabase: { from: table => ({ insert: async row => {
      rows.push({ table, ...row }); return { data: null, error: null };
    } }) } },
    '@/utils/secureStorage': { SecureStorage: { getItem: () => 'test-session', setItem() {} } },
    '@/utils/inputValidation': { RateLimiter },
  });
  const hooks = {
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
      return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }];
    },
    useRef(initial) { const index = cursor++; return slots[index] ??= { current: initial }; },
    useMemo: fn => fn(),
    useEffect(fn) { if (!mounted) cleanups.push(fn()); },
    useLayoutEffect() {},
  };
  const { default: PortfolioChat } = load('src/concepts/practice/PortfolioChat.tsx', {
    react: hooks,
    '@/integrations/supabase/config': { SUPABASE_URL: 'https://portfolio.test', SUPABASE_PUBLISHABLE_KEY: 'test-key' },
    '@/services/promptTrackingService': tracking,
    './chatContext': { portfolioInstructions: () => 'Portfolio context', retrieveProjects: () => [], retrieveWriting: () => [] },
    './chat/sources': { articleSources: () => [], citedSources: () => [], projectSource: project => project },
    './chat/stream': load('src/concepts/practice/chat/stream.ts'),
    './chat/AnimatedAnswer': { __esModule: true, default: () => null },
  });
  function render() {
    cursor = 0;
    const tree = PortfolioChat({ projects: [{ id: 'project' }], articles: [], writingLoading: false });
    mounted = true; return tree;
  }
  function find(predicate, node = render()) {
    if (!node || typeof node !== 'object') return;
    if (predicate(node)) return node;
    for (const child of [node.props?.children].flat(Infinity)) {
      const match = find(predicate, child ?? null); if (match) return match;
    }
  }
  return {
    rows, tracking,
    submit(question) {
      find(node => node.type === 'textarea').props.onChange({ target: { value: question } });
      find(node => node.type === 'form').props.onSubmit({ preventDefault() {} });
    },
    stop() { find(node => node.props?.['aria-label'] === 'Stop answer').props.onClick(); },
    reset() { find(node => node.props?.['aria-label'] === 'New conversation').props.onClick(); },
    retry() { return find(node => node.type === 'button' && node.props.children?.[0] === 'Try again ').props.onClick(); },
    unmount() { cleanups.forEach(fn => fn?.()); },
  };
}
const tick = () => new Promise(resolve => setImmediate(resolve));
const delta = content => `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`;
const sse = text => new Response(text, { headers: { 'Content-Type': 'text/event-stream' } });

test('Ask AI stores the submitted question and complete SSE answer in the terminal table and session', async t => {
  const chat = conversation();
  t.mock.method(globalThis, 'fetch', async () => sse(delta('A complete answer.') + 'data: [DONE]\n\n'));
  chat.submit('  What did Will build?  ');
  await tick();
  assert.deepEqual(chat.rows, [{ table: 'user_prompts', session_id: 'test-session', content: 'What did Will build?', response_content: 'A complete answer.' }]);
  await chat.tracking.savePrompt('Terminal question', 'Terminal answer');
  assert.equal(chat.rows[1].table, chat.rows[0].table);
  assert.equal(chat.rows[1].session_id, chat.rows[0].session_id);
  chat.unmount();
});

test('failed requests and retry each record one attempt; blank submissions are ignored', async t => {
  const chat = conversation(); let attempt = 0;
  t.mock.method(globalThis, 'fetch', async () => ++attempt === 1 ? new Response(null, { status: 503 }) : Response.json({ generatedText: 'Retry answer.' }));
  chat.submit('   '); await tick(); assert.equal(chat.rows.length, 0);
  chat.submit('A question to retry'); await tick();
  assert.equal(chat.rows[0].response_content, 'Error processing request');
  await chat.retry();
  assert.equal(chat.rows.length, 2);
  assert.equal(chat.rows[1].content, 'A question to retry');
  assert.equal(chat.rows[1].response_content, 'Retry answer.');
  chat.unmount();
});

for (const action of ['stop', 'reset', 'unmount']) {
  test(`${action} preserves the question and partial answer once, without duplicating an in-flight submission`, async t => {
    const chat = conversation();
    t.mock.method(globalThis, 'fetch', async () => sse(new ReadableStream({ start(controller) {
      controller.enqueue(new TextEncoder().encode(delta('Keep the partial answer.')));
    } })));
    chat.submit('Interrupted question'); await tick();
    chat.submit('Duplicate while busy');
    chat[action](); await tick();
    assert.deepEqual(chat.rows, [{ table: 'user_prompts', session_id: 'test-session', content: 'Interrupted question', response_content: 'Keep the partial answer.' }]);
    if (action !== 'unmount') chat.unmount();
  });
}
