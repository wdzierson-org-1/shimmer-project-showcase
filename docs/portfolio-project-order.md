# Project ordering and InsideTracker captions

The public All work view now reads the same `projects.display_order` field saved by the admin. The previous public query read `sort_order`, leaving newly added InsideTracker at the end despite its saved display position of 0.

The admin uses one sortable list for all projects. The old featured and regular sections assigned overlapping positions; homepage selection remains curated in the public code. The obsolete homepage feature switch has been removed from the editor without changing stored featured values. Search covers the full list and must be cleared before reordering.

Both queries use `display_order` ascending (nulls last), `created_at` descending, then `id` ascending. This preserves all saved positions and gives old ties a deterministic order. A drag normalizes the full list to unique positions and writes only changed `display_order` values. Saves run outside React state updaters, prevent overlapping drags, validate returned rows, and wait for all requests before reporting success or rereading persisted positions on failure. Public tabs refresh data when brought back into focus.

No project positions or schema were changed during release preparation. The existing InsideTracker position sorts first with the corrected reader.

## Captions

All ten InsideTracker images were inspected individually. Their captions were saved to `project_images.caption` for project `8d229fec-f5fb-41b2-9add-b6303536872c`; the exact text and image identifiers are recorded in `portfolio-insidetracker-captions.json`. Each write was scoped to its image and project, guarded against overwriting a nonempty caption, and verified after saving. Image URLs, sequence, and other fields were preserved. Captions describe prototypes and concepts without implying launched partnerships or measured outcomes. Every caption was also verified in the live project gallery.

## Verification

- Focused TypeScript and ESLint checks; production Vite build.
- Seventeen Node regressions across project ordering, chat streaming, and routes.
- Playwright with controlled API fixtures exercised the real admin component under StrictMode: keyboard drag across the former featured boundary, save feedback, exactly one write per affected project, reload persistence, search behavior, failed writes, and recovery.
- The public view matched the saved order and refreshed after a simulated reorder in another tab. These browser tests used no production project writes.

```sh
npx tsc -p tsconfig.portfolio.json --noEmit
node --test scripts/portfolio/test_project_order.mjs scripts/portfolio/test_chat_stream.mjs scripts/portfolio/test_routes.mjs
npm run build
```
