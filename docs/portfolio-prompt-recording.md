# Portfolio prompt recording

The Ask AI page and the floating terminal now call the existing `savePrompt` service. Both use `public.user_prompts` in Supabase project `uilvozcryifnpldfpwiz`, alongside the older terminal and chat UI. The admin prompt log reads this same table.

The redesigned interfaces had omitted these calls. Ask AI records each submitted attempt when its request finishes, fails, or is aborted, retaining the complete or partial answer when available. This also covers stopping, resetting the conversation, and navigating away within the site. An explicit retry creates another attempt. The terminal records normal questions, AI shortcuts, and request failures. Local commands such as `help` and `clear` remain local commands.

The existing session ID, validation, rate limit, and database permissions are reused. This remains client-side logging: a browser shutdown or failed database request can prevent a save, as with the older terminal. Previously unrecorded questions cannot be recovered by this fix.

Verification: focused TypeScript and ESLint checks, the production build, 17 existing regressions, and five submission/persistence regressions passed. The new tests exercise the real Ask AI callbacks, stream reader, and save service with an in-memory database boundary. Two labeled anonymous inserts through the shared service were read back from the production table, checking prompt text, response text, and session ID; only those test records were removed afterward. Browser verification was unavailable because no browser connection was exposed in this session.

Run the submission regressions with `node --test scripts/portfolio/test_prompt_tracking.mjs`.
