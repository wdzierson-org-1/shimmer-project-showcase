# Screenshot motion and portfolio conversation

Review the [portfolio](http://127.0.0.1:8081/practice.html) and [AI conversation](http://127.0.0.1:8081/practice.html#ask). These are local concept changes.

## Visual references

Reviewed the public previews and documentation for React Bits Pro [Particle Image](https://pro.reactbits.dev/docs/components/particle-image), [Pixel Reveal](https://pro.reactbits.dev/docs/components/pixel-reveal), [Scroll Mask](https://pro.reactbits.dev/docs/components/scroll-mask), and [AI Chat 6](https://pro.reactbits.dev/docs/app-ui/ai-chat/ai-chat-6). The Pro source-code tab requires a paid login, unavailable in this browser session. The screenshot effects and chat implementation here are original code informed by the visible behavior and layout; no gated Pro source was copied or bundled. The previously adapted, openly available React Bits background shaders retain their separate license and attribution.

## Screenshot treatment

`motion/WorkImage.tsx` wraps the existing Supabase image URLs in a reusable image plane. A temporary Canvas 2D mask dissolves in a diagonal field of pixels while the screenshot rises gently into position. Featured images then respond to normal page scrolling with up to 10px of travel and 0.7° of perspective rotation. A narrow contact shadow provides separation from the page.

The feature entrance lasts 1.05 seconds. Archive thumbnails use a lighter 0.62-second treatment; case-study images use 0.65 seconds on entry and image changes. Featured images and case-study images retain their complete native aspect ratio. The archive uses full-bleed 4:3 thumbnails, with the complete image available in the case study.

The real `<img>` provides sizing, alt text and normal browser loading. The temporary canvas never reads the image pixels, so it adds no image-CORS requirement and no WebGL context. It renders at a maximum width of 1100px and is removed after the entrance. The shared scroll scheduler runs only in response to scrolling/resizing and subscribes only visible featured images. No additional runtime package was installed.

Each image reveals once per mount. Leaving the viewport or hiding the tab finishes its reveal immediately. Keyboard focus exposes the image immediately. Reduced motion removes the mask and transforms; mobile uses a shorter lift without scroll parallax or perspective. Context failure leaves the actual screenshot available. Image links and gallery controls remain interactive during the effect.

## Conversation

**Superseded by [Cited answers and the interactive dashboard](portfolio-citations-dashboard.md):** the rail now contains citations only, writing is included, and the streaming backend update is prepared pending Supabase authentication. The following records the earlier implementation.


`PortfolioChat.tsx` now provides a conversation pane, suggested questions, a composer, and a source rail, drawing on AI Chat 6's split layout. The page uses the portfolio's warm paper and sage palette. The source rail shows actual records sent with the current question, then narrows to the projects cited by an answer. If the answer contains no validated citations, it says “Consulted for this answer.” Visitors can select the source set for an earlier answer and open any source case.

`chatContext.ts` ranks the live, visible project records using weighted title/client, tag, contribution and description matches. Recent questions have more weight; a case-specific conversation prioritizes that project. Six records and the full project index are supplied to the existing Supabase `chat` function, with the latest ten conversation turns. This is client-side lexical retrieval over the published CMS records, not a newly introduced vector-search service. Existing instructions limit claims to the supplied records and distinguish historical and exploratory work.

The existing service returns complete answers rather than a stream. The UI shows one honest waiting state. The reference's multiple simulated agents and handoff activity are replaced with the source rail. The AI is clearly identified as a guide to the work, not Will himself.

The composer supports Enter to send, Shift+Enter for a newline, IME composition, follow-ups, copy, retry, and a new conversation. “Stop waiting” cancels the local wait and discards any late answer; the existing server endpoint does not expose cancellation of upstream generation. A 45-second timeout also clears the waiting state. Requests finishing after a reset or route change cannot overwrite the new conversation. Conversations remain in component memory.

The conversation log announces new messages and preserves the reader's position when they scroll back, offering “New answer” to return to the latest reply. On mobile the sources follow the conversation in normal page flow. Markdown links resolve only to known local cases; arbitrary external image embeds are not rendered.

## Verification

- Live Supabase AI: asked about Google Beijing, received an answer with a matching case citation, and asked a follow-up about Will's contribution. The follow-up retained the project context. The source link opened the matching case.
- Isolated browser fixtures: failure and retry retained one user question; clipboard copy succeeded; Shift+Enter did not submit; stopping and resetting ignored late replies; a case-specific question prioritized the correct project. A long conversation kept its position while reading older messages and correctly jumped to the new answer. A response without citations showed “Consulted for this answer.”
- Image inspection: captured the in-progress pixel mask and final frame, checked the desktop depth transform changed with scrolling, and confirmed completed masks were removed. Observed a 95th-percentile draw interval of about 17.4ms during the desktop reveal run; this is a local-browser measurement.
- All 21 published projects remained in the archive; filtering for Google returned both relevant projects. Detail next-image and keyboard previous-image navigation passed.
- At 390px and 320px, featured images and chat had no horizontal overflow. Reduced motion produced no image masks and no image-plane transform.
- TypeScript, focused ESLint and the concept production build pass. Existing build notices concern stale Browserslist data and the optional CRT renderer's large bundle.

Captured review images are in `.playwright-mcp/`, including `work-motion-build.png`, `work-motion-features.png`, `work-motion-mobile.png`, and `portfolio-chat-live.png`.

## September refinement: reveal timing and page rhythm

Image entrances now wait until 42% of the image height is visible, capped at 38% of the viewport for tall screenshots. An observer recalculates the threshold after image/layout and viewport resizing. A static mask holds the unrevealed area until then, so a visitor does not see an image appear and subsequently disappear to start its entrance. Waiting in a background tab does not consume the animation. Keyboard focus, reduced motion and load errors expose the image immediately.

The homepage has 118px below the lead case and 125px between subsequent grid rows (100px on narrower desktop screens, 76px between mobile cases). The hero reads “From complex ideas to working products.”, removes the repeated name from the eyebrow, and adds “Currently:” with an InsideTracker link. The footer reads “Will Dzierson © 2026”.
