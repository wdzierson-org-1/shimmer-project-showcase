export const CHAPTER_SECONDS = 8;
export const chapters = [
  {
    name: 'The instinct', period: 'A universal reflex', credit: 'Save first. Find later.',
    title: 'I need to\nsave this.',
    body: 'A link, a thought, a photo, a voice memo. The reflex is universal. But saving is the easy part — finding it again is where everything breaks.',
    evidence: 'gostash.it / ST4SH — Smarter saving',
    image: '/portfolio/stash/home.png',
  },
  {
    name: 'Every surface', period: 'Meet people where they are', credit: 'Web · iOS · Chrome · macOS · MCP',
    title: 'One product.\nFive surfaces.',
    body: 'A web app, an iOS app with share sheet, a Chrome extension, a macOS menubar app, and an MCP server. Capture in one tap, one click, one keyboard shortcut.',
    evidence: 'SwiftUI + StashKit · MV3 extension · Electron menubar · Streamable HTTP',
    image: '/portfolio/stash/extension.png',
  },
  {
    name: 'Enrichment', period: 'Server-side intelligence', credit: 'You save the raw thing. Stash makes it findable.',
    title: 'Enrichment\nat the edge.',
    body: 'Every save triggers a pipeline: title extraction, transcription, OCR, summarization, embeddings. Forty edge functions turning raw input into searchable knowledge.',
    evidence: 'Supabase edge functions · AI enrichment · Link flavor detection',
    image: '/portfolio/stash/ios-library.png',
  },
  {
    name: 'Ask Stash', period: 'Conversational search', credit: 'Not keywords — understanding.',
    title: 'Search by\nmeaning.',
    body: 'Ask Stash searches across everything you\'ve saved. Semantic understanding, not keyword matching. Answers cite sources. Your AI gets the substance, not a pile of bare links.',
    evidence: 'Embedding search · Source citation · Conversational interface',
    image: '/portfolio/stash/ios-ask.png',
  },
  {
    name: 'The language', period: 'Grey chrome, color as information', credit: 'PP Neue Montreal · Lucide · No decoration.',
    title: 'The object\nis the hero.',
    body: 'Type-specific tints — violet for interactive, warm grey for neutral, red for destructive. Every pixel earns its place. The design language evolved through rigorous card readability studies.',
    evidence: 'Card readability iterations · Logo refresh · iOS design system v2',
    image: '/portfolio/stash/card-readability.png',
  },
  {
    name: 'Inside your AI', period: 'MCP server', credit: 'Claude · ChatGPT · Cursor · VS Code',
    title: 'Your stash, inside\nevery AI you use.',
    body: 'An MCP server gives any AI assistant read-only access to your stash. Sign in once, approve it, and your AI can search everything you\'ve saved. Every request logged. You stay in charge.',
    evidence: 'OAuth · Read-only · search_stash · get_item · $4.99/month',
    image: '/portfolio/stash/home.png',
  },
];
export const DURATION = chapters.length * CHAPTER_SECONDS;
export function chapterAt(time: number) { return Math.max(0, Math.min(chapters.length - 1, Math.floor(time / CHAPTER_SECONDS))); }
export function formatTime(time: number) { return `${String(Math.floor(time / 60)).padStart(2, '0')}:${String(Math.floor(time % 60)).padStart(2, '0')}`; }
