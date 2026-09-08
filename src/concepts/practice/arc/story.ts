/** A personal narrative adapted from Will's own words, with career anchors from his résumé. */
export const CHAPTER_SECONDS = 9;
export const chapters = [
  {
    name: 'A question', period: 'The beginning', credit: 'It started with a question.',
    title: 'How can this\nbe made better?',
    body: 'A question I couldn’t stop asking. About the things I used. The experiences I had. The world around me.',
    evidence: 'A designer’s journey / Will Dzierson',
  },
  {
    name: 'Why', period: 'Little by little', credit: 'One question led to another.',
    title: 'Why?',
    body: 'Asking why became a way of seeing. Seeing became a way of making. And, little by little, experience became craft.',
    evidence: 'Curiosity → experience → understanding',
  },
  {
    name: 'Untethered', period: 'An extraordinary opening', credit: 'Yahoo! · Google · Salesforce',
    title: 'Information,\nuntethered.',
    body: 'Curiosity opened extraordinary doors. Mobile was my first great information revolution—a whole new way to move through the world.',
    evidence: 'Early mobile design · New interactions · A world beyond the desktop',
  },
  {
    name: 'Purpose', period: 'A deeper kind of reward', credit: 'Grand Rounds · Included Health',
    title: 'Helping people\nlive healthier.',
    body: 'In healthcare, I found a deeper purpose. Helping someone feel heard, find care, or understand their health is its own reward.',
    evidence: 'From clinical tools to voice experiences',
  },
  {
    name: 'Possibility', period: 'A new beginning', credit: 'Noodle AI · Voice · Agentic systems',
    title: 'And now,\nAI.',
    body: 'AI brings that feeling back. I started Noodle to explore it—designing, building, and asking what these systems should become.',
    evidence: 'From early RAG to writing about agent accountability',
  },
  {
    name: 'What’s next', period: 'Still curious', credit: 'After 25+ years, the question remains.',
    title: 'What comes next?',
    body: 'I’m just as excited as you are to find out. And I’m still asking: how can this be made better?',
    evidence: 'The work continues.',
  },
];
export const DURATION = chapters.length * CHAPTER_SECONDS;
export function chapterAt(time: number) { return Math.max(0, Math.min(chapters.length - 1, Math.floor(time / CHAPTER_SECONDS))); }
export function formatTime(time: number) { return `${String(Math.floor(time / 60)).padStart(2, '0')}:${String(Math.floor(time % 60)).padStart(2, '0')}`; }
