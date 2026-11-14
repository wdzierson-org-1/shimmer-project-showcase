export const CHAPTER_SECONDS = 8;

export const chapters = [
  {
    name: 'The problem', period: 'A familiar frustration', credit: 'Links are dead ends.',
    title: 'Don\'t just send\na link.',
    body: 'You find something worth sharing. You drop a link. Nobody reads it. The idea, the argument, the recipe — lost in a tab they never opened.',
    evidence: 'gisted.co / Vibrant Labworks (Founder)',
    image: '/portfolio/gisted/home.png',
  },
  {
    name: 'Enrichment', period: 'AI-powered understanding', credit: 'Paste anything. Gisted extracts what matters.',
    title: 'Get the gist.',
    body: 'Paste a video, article, recipe or doc. Gisted pulls out summaries, key moments, transcript, mentions, diagrams — and surfaces things you could add to make the page more useful.',
    evidence: 'YouTube · Books · Slides · PDFs · TikToks · Health articles · Recipes',
    image: '/portfolio/gisted/enrich.png',
  },
  {
    name: 'Your take', period: 'The person comes first', credit: 'Not just summarization — enrichment-as-presentation.',
    title: 'Add your\nperspective.',
    body: 'Your take is the first thing readers see. Gisted turns a bare URL into a page with your voice at the center, with AI suggestions to help you say more.',
    evidence: 'Page editor · Suggestion rail · Ask Gisted AI',
    image: '/portfolio/gisted/customize.png',
  },
  {
    name: 'The page', period: 'A page people actually open', credit: 'Rich, customizable, conversational.',
    title: 'Something worth\nopening.',
    body: 'Videos, slide decks, reading views — each content type gets its own treatment. Ask Gisted lets readers explore the source material through conversation.',
    evidence: 'Video workspace · Deck viewer · Generated videos',
    image: '/portfolio/gisted/video.png',
  },
  {
    name: 'Conversation', period: 'Feedback built in', credit: 'Not just sharing — starting a conversation.',
    title: 'Send it.\nHear back.',
    body: 'Reactions, comments, ratings, polls, date pickers, grocery lists. Share via link, email, LinkedIn or X, and see who opened it, what they thought, and what they answered.',
    evidence: 'Feedback · Social sharing · Response tracking',
    image: '/portfolio/gisted/send.png',
  },
  {
    name: 'The system', period: 'From idea to SaaS', credit: 'Design, engineering, and operations — end to end.',
    title: 'Forty edge functions\nand a clear idea.',
    body: 'React and TypeScript on the surface, Supabase and 40+ edge functions underneath. Stripe billing, a Chrome extension, video generation, and a design language built on warmth and clarity.',
    evidence: 'Vite · React · TypeScript · Supabase · Stripe · Vercel',
    image: '/portfolio/gisted/dashboard.png',
  },
];

export const DURATION = chapters.length * CHAPTER_SECONDS;
export function chapterAt(time: number) { return Math.max(0, Math.min(chapters.length - 1, Math.floor(time / CHAPTER_SECONDS))); }
export function formatTime(time: number) { return `${String(Math.floor(time / 60)).padStart(2, '0')}:${String(Math.floor(time % 60)).padStart(2, '0')}`; }
