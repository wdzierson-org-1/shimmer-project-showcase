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
    body: 'Asking why taught me to look closer. Making taught me to understand. Little by little, I learned to design the idea—and build it into something real.',
    evidence: 'Observe. Understand. Make. Repeat.',
  },
  {
    name: 'Untethered', period: 'An extraordinary opening', credit: 'Yahoo! · Google · Salesforce',
    title: 'A world beyond\nthe desktop.',
    body: 'At Google and beyond, I helped explore mobile while its possibilities were still taking shape. Information could finally move with us. Everything felt open.',
    evidence: 'Early mobile design · New interactions · A world beyond the desktop',
  },
  {
    name: 'Purpose', period: 'A deeper kind of reward', credit: 'Grand Rounds · Included Health',
    title: 'Better technology.\nHealthier lives.',
    body: 'In healthcare, I found a deeper purpose. Helping someone feel heard, find care, or understand their health is its own reward.',
    evidence: 'From clinical tools to voice experiences',
  },
  {
    name: 'Possibility', period: 'A new beginning / 2023', credit: 'Co-founder, Noodle AI',
    title: 'An idea worth\nbuilding.',
    body: 'AI brought that feeling back. In 2023, I co-founded Noodle, turning scattered health records into a working companion.',
    evidence: 'Early RAG · End-to-end design · Hands-on engineering',
  },
  {
    name: 'What’s next', period: 'Still curious', credit: 'After 25+ years, the question remains.',
    title: 'What comes next?',
    body: 'Today I lead, build, and write about AI—and the responsibility that comes with it. The tools change. The question stays: how can this be made better?',
    evidence: 'A builder’s practice. A beginner’s curiosity.',
  },
];
export const DURATION = chapters.length * CHAPTER_SECONDS;
export function chapterAt(time: number) { return Math.max(0, Math.min(chapters.length - 1, Math.floor(time / CHAPTER_SECONDS))); }
export function formatTime(time: number) { return `${String(Math.floor(time / 60)).padStart(2, '0')}:${String(Math.floor(time % 60)).padStart(2, '0')}`; }
