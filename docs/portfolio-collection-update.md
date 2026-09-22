# Portfolio collection and Q&A update

The practice prototype now reads all public projects directly from Supabase through the existing browser client. It requests only visible projects and their ordered media, including captions and video posters. The previous six-project snapshot is no longer the project data source; the existing writing snapshot remains in use.

The editorial feature selection is defined in `src/concepts/practice/projects.ts`: Included Health, Google Beijing, Project Ariadne, Optum Store, Smithsonian SIguide, and Agentic OS. This changes the preview, not CMS records. Noodle's dissolved status is applied as a presentation correction.

All work has a searchable index. Experience links filter this index by client. Detail pages have an ordered image/video gallery with captions, thumbnails, arrow buttons, keyboard navigation, touch gestures, full-size links, and previous/next project links.

Portfolio Q&A calls the existing Supabase `chat` edge function with conversation history and six relevant published project records. Retrieval is local keyword ranking across titles, clients, descriptions, and contributions, with additional weighting for the current case. It does not use the existing embedding search pipeline. Responses are instructed to cite supplied case URLs; the interface only renders project links that resolve to published IDs. No model key is exposed. The chat includes a timeout, retry state, and new-conversation control. Existing terminal AI remains on its original RAG service.

Verified with Playwright: live collection contains 21 projects; Google search returns 2; Google Beijing gallery contains 11 media items; image next and keyboard controls change the displayed caption; Agentic OS video controls render; live AI explained Will's Beijing contribution with a case citation; a follow-up correctly identified George Zhang; the citation navigates to the case; a mocked 503 displays retry; mobile home, index, detail, and Q&A have no horizontal overflow. The terminal lists all 21 projects. Screenshot capture timed out, so fresh screenshot QA is outstanding.

TypeScript, ESLint and the concept production build pass. The existing lazy CRT bundle still triggers Vite's large-chunk advisory. No production deployment or CMS writes were performed.
