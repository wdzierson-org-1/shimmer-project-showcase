const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

/** Streaming is opt-in so the original terminal and other JSON clients keep their existing contract. */
export function createChatHandler(apiKey: string | undefined, request: typeof fetch = fetch) {
  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
    if (req.method !== 'POST') return json({ error: 'Use POST for chat requests.' }, 405);
    let input;
    try { input = await req.json(); } catch { return json({ error: 'A JSON request is required.' }, 400); }
    const { messages, model = 'gpt-4o-mini', stream = false } = input || {};
    if (!Array.isArray(messages) || !messages.length || messages.some(m => !m || typeof m.role !== 'string' || typeof m.content !== 'string')) return json({ error: 'A valid messages array is required.' }, 400);
    if (!apiKey) return json({ error: 'The answer service is unavailable.' }, 503);
    try {
      const response = await request('https://api.openai.com/v1/chat/completions', {
        method: 'POST', signal: req.signal,
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, max_tokens: 800, temperature: .7, stream: stream === true }),
      });
      if (!response.ok) { await response.body?.cancel(); return json({ error: 'The answer service is unavailable.' }, response.status === 429 ? 429 : 502); }
      if (stream === true) {
        if (!response.body) return json({ error: 'The answer stream is unavailable.' }, 502);
        // Forward the upstream stream directly. Downstream reader cancellation propagates upstream.
        return new Response(response.body, { headers: { ...corsHeaders, 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', 'X-Accel-Buffering': 'no' } });
      }
      const data = await response.json();
      const generatedText = data.choices?.[0]?.message?.content;
      if (typeof generatedText !== 'string') return json({ error: 'The answer service returned no text.' }, 502);
      return json({ generatedText });
    } catch { return json({ error: 'The answer could not be completed.' }, 502); }
  };
}
