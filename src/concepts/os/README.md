# Concept 04: a personal operating system

Preview: http://127.0.0.1:8081/os.html

From the repository root:

```sh
npm ci --prefix src/concepts/os --ignore-scripts
npx vite --config vite.concepts.config.ts
```

The original three directions remain at `/concepts.html`. This concept has its own HTML entry and styles; it does not mount the existing App or run its database-setup effects. Root dependencies and existing application edits are preserved.

## What is implemented

- Aspect's real headless WindowManager and ScreenBounds, with a new visual shell.
- Draggable/resizable windows, focus stacking, minimize/restore, maximize/restore, dock indicators, and an app launcher (Cmd/Ctrl K).
- Guest desktop, drive/folder navigation, welcome note, and daylight/evening wallpapers. On small screens, the focused app fills the workspace and the dock switches apps.
- Portfolio browser reads visible projects and images from the existing Supabase client. Selecting a project opens its description inside the app. When the archive fails or is empty, clearly labeled recovery UI offers a retry and links to known projects. It is a native project view inside browser chrome, not an arbitrary-URL browser or an iframe of the live homepage.
- Field Notes has a sourced introduction and two clearly labeled concept drafts. It is not yet connected to published writing.
- Listening Room plays the existing Max Richter track, with play/pause, seek, restart, volume, and load-error handling. No autoplay. Minimizing keeps it available; closing removes the player.
- Screening Room plays the demo linked in the AspectOS README. Favorite video selections are pending.
- Terminal uses the existing `cool-retro-term-renderer`, supports CRT/plain text, display overscan, and commands `help`, `ls`, `open <app>`, `whoami`, `ask`, and `clear`. Overscan scales the renderer surface. It provides no system-shell access. Reduced-motion users start in plain text. The renderer is disposed when minimized or closed. Its large graphics/font bundle is lazy-loaded only when Terminal is opened.
- Willbot invokes this workspace's existing `processUserMessage` RAG service after a visitor submits a question. Returned project/content links remain accessible. Errors retain the question for retry. This is the current workspace service, not the newer checkout's persona pipeline.
- Contact is a draft composer with copy and an email handoff. Telegram is explicitly unconnected until a handle is supplied. Nothing is sent from the contact app.

## Source provenance

The user-provided framework is https://github.com/wdzierson/aspect-os. The local checkout has that exact origin and commit `ebeca608993ecfd9a54e38ff9224b9854fc83bdd`.

`vendor/aspect/{WindowManager,ScreenBounds,types}.ts` are unmodified copies from its `packages/core/src` directory. The upstream README and package metadata identify AspectOS as MIT-licensed. This preview uses the headless core subset, not the full UI/VFS packages. A production implementation should consume the published/workspace packages and register these app components through Aspect's app lifecycle.

The newer portfolio checkout at `/Users/will/Appdev/shimmer_new/shimmer-project-showcase` supplied the existing renderer identity and audio URL. It was read only. `cool-retro-term-renderer@1.0.1` is installed as a dependency with its `@xterm/xterm@6.0.0` and `three@0.180.0` peers under this folder; its package metadata identifies GPL-3.0. Library source was not copied into the application source.

## Verification and remaining work

Passed: production build, `npx tsc -p tsconfig.concepts.json --noEmit`, targeted ESLint, five Aspect lifecycle tests, and HTTP 200 for the preview entry. Run the lifecycle tests with:

```sh
npx esbuild src/concepts/os/window-manager.test.ts --bundle --platform=node --format=cjs --outfile=/tmp/aspect-portfolio-window-tests.cjs
node --test /tmp/aspect-portfolio-window-tests.cjs
```

Browser runtime reports no available browsers, so visual inspection, pointer/touch interaction, media playback, and live RAG responses have not been verified end to end. The build reports the expected large lazy CRT chunk (approximately 883 KB gzip).

Before production: verify those browser flows, bring in actual writing/playlists/video selections, connect the supplied Telegram handle, integrate the preferred RAG pipeline, and decide whether guest layouts should persist. Backend setup, deployment, and sending messages are outside this concept's implementation.

## Visual refinement

The arrival state now opens only the portfolio, centered in the workspace. The desktop has one drive shortcut. Five apps are pinned to the dock; other apps are available through All apps / the menu and appear in the dock while running. The welcome note remains available through Will Dzierson in the menu or the launcher.

The prototype banner, wallpaper lettering, guest status, duplicate contact shortcut, window-chrome subtitles, and decorative footer copy were removed. Concept information, alternative directions, and wallpaper selection live under About. App functionality is retained.

The palette now uses cobalt for the desktop and primary actions, orange for media and notebook accents, and neutral white-blue window surfaces. The wallpaper has two simple forms; icons have less gloss; window shadows are lighter. Checks passed: production build, TypeScript, targeted lint. Browser visual verification remains unavailable.
