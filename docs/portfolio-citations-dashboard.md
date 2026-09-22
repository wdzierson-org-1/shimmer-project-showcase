# Cited answers and the interactive risk dashboard

Preview: http://127.0.0.1:8081/practice.html and http://127.0.0.1:8081/practice.html#ask.

## Chat

The right rail is empty until the selected answer contains a complete, validated Markdown citation. Retrieved-but-uncited records never appear. Sources are ordered by their first citation, deduplicated, and fade in independently. Choosing an earlier answer restores that answer’s citations. Project and article links open in a new tab to preserve the conversation.

The public, visible `thought` records in Supabase now join published projects in retrieval. Three relevant writing records and six projects can be sent with a question. Public Medium titles missing full text in the CMS are explicitly marked as metadata-only; the instructions prohibit inferring their arguments. Internal essay URLs render published CMS content; matching Medium publications use their original links. No CMS records were changed.

The word reveal is original code, informed by the visible [React Bits Pro AI Chat 6](https://pro.reactbits.dev/docs/app-ui/ai-chat/ai-chat-6) preview. Its source tab remains behind a paid login and was not copied. Stable Markdown word nodes fade from a small blur as actual response text arrives; previous words are preserved and reduced motion disables the effect. Incomplete citation URLs are withheld until complete. The conversation log is marked busy during generation to avoid announcing every word.

`chat/stream.ts` parses [Chat Completions server-sent events](https://developers.openai.com/api/reference/resources/chat/subresources/completions/streaming-events), including arbitrary network boundaries, split UTF-8 characters and CRLF delimiters. Request aborts cancel reading; partial answers survive stop/error, retries replace the interrupted answer without duplicating the question, and resets discard late results. A 60-second timeout bounds the request. Old JSON responses are supported without pretending they streamed.

`supabase/functions/chat/handler.ts` makes streaming opt-in via `stream: true`. Requests omitting it retain the original `{ generatedText }` JSON response, model, token limit and temperature. The handler forwards the upstream stream and request abort signal and does not expose the server API key. The public browser configuration is shared with the existing Supabase client.

### Activation status

The backend change is implemented and tested locally but **not deployed**. The Supabase MCP returns “JWT could not be decoded” and the local CLI reports that no access token is available. The user has been asked to reconnect Supabase or run `supabase login`. Once authenticated, inspect the current deployed function, retain its gateway authentication setting, deploy this backward-compatible change, and verify real incremental delivery as well as a legacy JSON request. The current preview works against the existing service using the JSON fallback; production token streaming cannot activate until that deployment.

## Dashboard

The featured raster has been replaced with original HTML and SVG recreating the supplied Public Health Company screen: General Motors navigation, the five-row location table, Johor case forecast, uncertainty band and the 59/25 indices. Typography, grid lines and curves remain crisp at any scale. The original project images remain in the case study and archive.

The default table values and Johor shape follow the screenshot. The other locations’ forecasts and indices are illustrative demonstration values, not recovered production data; the study is labeled as an interactive reconstruction with illustrative 2021 data.

On entry, rows fade in at 120ms intervals; axes follow, then the historical curve, then the projected curve and uncertainty band/edges. The chart has its own visibility threshold so its reveal is not consumed above the viewport on phones. Native CSS animation pauses offscreen and in a hidden tab. Reduced motion presents everything immediately. A quiet Replay control repeats the sequence.

Selecting a location updates its forecast and indices; arrow keys move between location buttons. The chart supports mouse inspection, touch selection and keyboard arrows/Home/End/Escape. Share copies the case link; Download exports the selected chart as SVG. Narrow screens stack the panels and shorten date labels. The original navigation labels are part of the visual reconstruction rather than nonfunctional app buttons.

The brand-wall headings have been swapped to “Selected teams & clients” and “Skills acquired working with world class companies, clients, and teams.”

## Verification

- Live existing service: a question about AI accountability returned an answer grounded in the CMS essay and exactly one matching Medium source. Contextual chat starts with no source cards.
- Browser streaming fixtures: text appeared before completion; first and second citations populated the rail as their links completed, with opacity animations. A follow-up began with an empty rail, an answer without citations left it empty, and selecting the earlier answer restored its two sources. Stop, retry, mid-stream failure and reset preserved the correct state.
- Node regression tests cover incremental delivery, split UTF-8/CRLF/events, cancellation, truncated/malformed streams, legacy JSON, citation validation, edge preflight/validation/errors, legacy/stream contracts and upstream body cancellation. Run `node --test scripts/portfolio/test_chat_stream.mjs`.
- Dashboard timing was sampled at approximately 330ms (three partially revealed rows, no chart), 1180ms (rows complete, axes appearing), 1830ms (curve drawing, band hidden), and completion (all visible).
- Location selection, keyboard selection, chart inspection, SVG export, published essay routes and 390px/320px overflow checks passed. Reduced motion reveals every row and chart immediately with no animation.
- TypeScript, focused ESLint and the concept production build pass. Existing build notices concern stale Browserslist data and the optional CRT bundle.
