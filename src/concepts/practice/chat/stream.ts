/** Read Chat Completions SSE without assuming that network chunks align with events or UTF-8 characters. */
export async function readAnswerStream(response: Response, signal: AbortSignal, onText: (text: string) => void) {
  if (!response.ok) throw new Error('The answer service is unavailable.');
  // Older deployments still work, without presenting a complete response as a simulated stream.
  if (response.headers.get('content-type')?.includes('application/json')) {
    const data = await response.json();
    signal.throwIfAborted();
    if (typeof data.generatedText !== 'string' || !data.generatedText.trim()) throw new Error('Empty answer.');
    onText(data.generatedText); return data.generatedText as string;
  }
  if (!response.headers.get('content-type')?.includes('text/event-stream') || !response.body) throw new Error('Unsupported answer response.');
  const reader = response.body.getReader(), decoder = new TextDecoder();
  let buffer = '', text = '', finished = false, finishReason: string | null = null;
  const cancel = () => { void reader.cancel(signal.reason).catch(() => {}); };
  signal.addEventListener('abort', cancel, { once: true });
  const event = (block: string) => {
    const payload = block.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n');
    if (!payload) return;
    if (payload.trim() === '[DONE]') { finished = true; return; }
    const value = JSON.parse(payload);
    if (value.error) throw new Error('The answer stream failed.');
    const choice = value.choices?.[0];
    if (choice?.finish_reason) finishReason = choice.finish_reason;
    const delta = choice?.delta?.content ?? choice?.delta?.refusal;
    if (typeof delta === 'string') { text += delta; onText(text); }
  };
  try {
    signal.throwIfAborted();
    while (!finished) {
      const { value, done } = await reader.read(); signal.throwIfAborted();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      // Normalize complete CRLF sequences, retaining a split CR until the next chunk arrives.
      buffer = buffer.replace(/\r\n/g, '\n');
      let boundary: number;
      while ((boundary = buffer.indexOf('\n\n')) !== -1) {
        event(buffer.slice(0, boundary)); buffer = buffer.slice(boundary + 2);
        if (finished) break;
      }
      if (done) { if (buffer.trim()) event(buffer); break; }
    }
    if (!finished || !text.trim() || (finishReason && finishReason !== 'stop')) throw new Error('The answer was interrupted.');
    return text;
  } finally {
    signal.removeEventListener('abort', cancel);
    await reader.cancel().catch(() => {}); reader.releaseLock();
  }
}
