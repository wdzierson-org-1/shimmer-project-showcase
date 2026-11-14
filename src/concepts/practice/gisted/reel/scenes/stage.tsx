import { AliveThumb, Avatar, BookCover, DeckCover, Doodle, Icon, Photo, Pointer, Wordmark } from '../art';
import { a, useAt, vars } from '../clock';
import { EDGES, NODES, stepped, STORY, TRACE, typed } from '../timeline';
import { World } from './app';

/* The scenes with no app window in front: the opening, the six kinds of content, hearing back,
   the system, and the close. Here the WebGL layer is in full view behind the type. */

/** The wordmark and the line it stands for. The spark above it is the particles' to draw. */
export function TitleCard({ at, cta }: { at: number; cta?: boolean }) {
  return (
    <div className="gr-title">
      {/* Shown only where there is no WebGL to gather the spark from particles. */}
      <Doodle name="sparkle" className="gr-title-spark" at={at - 0.9} d={0.9} strokeWidth={1.5} />
      <div {...a('rise', at, 0.9)}><Wordmark className="gr-title-mark" /></div>
      <p className="gr-title-line is-dim" {...a('rise', at + 0.35, 0.7)}>Don’t just send a link.</p>
      <p className="gr-title-line" {...a('rise', at + 0.55, 0.7)}>Send <span>the gist<Doodle name="underline" at={at + 1.0} d={0.6} strokeWidth={5} /></span>.</p>
      {cta
        ? <span className="gr-title-cta" {...a('pop', at + 1.5, 0.5)}>gisted.co<Icon name="arrowRight" /></span>
        : <small {...a('fade', at + 1.3, 0.8)}>AI-powered sharing · Vibrant Labworks (Founder) · 2026</small>}
    </div>
  );
}

/* ------------------------------------------------------------------ the opening */

export function Hook() {
  const seen = useAt((t) => t >= 1.3);
  const typing = useAt((t) => t >= 1.7 && t < 2.4);
  return (
    <World>
      <div {...a('out', 6.45, 0.5)}>
        <div {...a('out', 2.5, 0.4)}>
          <h2 className="gr-kinetic gr-hook-a" {...a('kinetic', 0.25, 0.7)}>You sent a link.</h2>
          <h2 className="gr-kinetic gr-hook-b" {...a('kinetic', 1.45, 0.7)}>It just sat there.</h2>
          <div className="gr-hook-bubble" {...a('pop', 0.5, 0.5)} />
          <span className="gr-hook-state" {...a('fade', 0.9, 0.3)}>{seen ? 'Seen' : 'Delivered'}</span>
          {typing && <span className="gr-hook-typing"><i /><i /><i /></span>}
        </div>
        {/* The same words, in the same place, as the particles that take over from them. */}
        <span className="gr-hook-link" {...a('fade', 0.62, 0.4)}><span {...a('out', 2.52, 0.28)}>{STORY.url}</span></span>
        <TitleCard at={4.5} />
      </div>
    </World>
  );
}

export function Close() {
  return <World><TitleCard at={1.7} cta /></World>;
}

/* ------------------------------------------------------------------ any content */

const KINDS: { cover: 'video' | 'book' | 'deck' | 'place' | 'recipe' | 'product'; type: string; title: string; icon: string; add: string }[] = [
  { cover: 'video', type: 'YouTube', title: 'A video on a hard idea', icon: 'branch', add: 'a diagram that makes it click' },
  { cover: 'book', type: 'Book', title: 'A book you keep recommending', icon: 'chat', add: 'questions for a book club' },
  { cover: 'deck', type: 'Slides', title: 'Slides that need a second look', icon: 'scale', add: 'a rating: is it ready?' },
  { cover: 'place', type: 'TikTok', title: 'A place you want to go', icon: 'calendar', add: 'a calendar of who’s free' },
  { cover: 'recipe', type: 'TikTok', title: 'A recipe for Thursday', icon: 'basket', add: 'a grocery list, scaled' },
  { cover: 'product', type: 'Product', title: 'Something you might buy', icon: 'question', add: 'a poll on the color' },
];
const KIND_W = 172;
const spotAt = (i: number) => 1.45 + i * 0.7;

export function Kinds() {
  return (
    <World>
      <div {...a('out', 6.05, 0.45)}>
        <h2 className="gr-kinetic gr-kinds-h" {...a('kinetic', 0.1, 0.7)}>Made for whatever you’re sharing.</h2>
        <div className="gr-kinds">
          {KINDS.map((kind, i) => (
            <div key={kind.title} className="gr-kind" {...a('deal', 0.3 + i * 0.09, 0.75, { left: i * 181.6 })}>
              <div className="gr-kind-card" {...a('lift', spotAt(i), 1.05)}>
                <div className="gr-kind-cover">
                  {kind.cover === 'video' ? <AliveThumb /> : kind.cover === 'book' ? <BookCover /> : kind.cover === 'deck' ? <DeckCover /> : <Photo name={kind.cover} width={KIND_W} />}
                </div>
                <small>{kind.type}</small>
                <b>{kind.title}</b>
                <p {...a('rise', spotAt(i) + 0.12, 0.4)}><Icon name={kind.icon} /><span><em>Gisted adds</em>{kind.add}</span></p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </World>
  );
}

/* ------------------------------------------------------------------ hear back */

const REACTED = 1.3, RATED = 2.35, ANSWER = 3.9, ANSWERED = 5.7, LOOP = 7.2;
const FEED: [number, string, string, string][] = [
  [REACTED + 0.12, 'Maya Chen', 'bulb', 'learned something'],
  [RATED + 0.12, 'Maya Chen', 'scale', 'rated it 4 of 5 for “worth the time”'],
  [3.2, 'Jordan Lee', 'heart', 'loves this'],
  [ANSWERED + 0.12, 'Maya Chen', 'chat', 'answered: “The catch at 10:05 got me.”'],
  [LOOP + 0.2, 'Maya Chen', 'sparkle', 'is making a gist of her own'],
];
const STATS: [string, [number, number][]][] = [
  ['reactions', [[0, 3], [REACTED + 0.12, 4], [3.2, 5]]],
  ['ratings', [[0, 0], [RATED + 0.12, 1]]],
  ['answers', [[0, 0], [ANSWERED + 0.12, 1]]],
];

function Stat({ label, steps }: { label: string; steps: [number, number][] }) {
  const index = useAt((t) => { let i = 0; steps.forEach(([at], n) => { if (t >= at) i = n; }); return i; });
  return <div><b key={index} {...a('bump', steps[index][0], 0.45)}>{steps[index][1]}</b><span>{label}</span></div>;
}

export function HearBack() {
  const reacted = useAt((t) => t >= REACTED);
  const rated = useAt((t) => t >= RATED);
  const answer = useAt((t) => typed(STORY.answer, t, ANSWER, 34).length);
  const answering = useAt((t) => t >= ANSWER - 0.2 && t < ANSWERED);
  const answered = useAt((t) => t >= ANSWERED);
  return (
    <World>
      <div {...a('out', 9.0, 0.5)}>
        <div className="gr-phone" {...a('phone', 0.05, 0.75)}>
          <div className="gr-phone-screen">
            <div className="gr-reader-bar"><Avatar name="Sam Rivera" /><span><b>Sam Rivera</b> shared this with you</span></div>
            <div className="gr-reader" {...a('scroll', 2.75, 0.7, vars({ '--gr-by': '-212px' }))}>
              <div>
                <blockquote className="gr-reader-take">
                  <Doodle name="quote" className="gr-reader-quote" />
                  {STORY.take}
                  <cite><Avatar name="Sam Rivera" />Sam’s take</cite>
                </blockquote>
                <h3>{STORY.title}</h3>
                <div className="gr-reader-media"><AliveThumb /></div>
                <div className="gr-reacts">
                  <span className={reacted ? 'is-mine' : ''} data-spot="react"><Icon name="bulb" />Learned something<b>{reacted ? 4 : 3}</b></span>
                  <span><Icon name="heart" />Love this<b>2</b></span>
                </div>
                <div className="gr-rate">
                  <b>Tell Sam what you think</b>
                  <p>“{STORY.statement}”</p>
                  <div>{[1, 2, 3, 4, 5].map((n) => <i key={n} className={n === 4 && rated ? 'is-on' : ''} data-spot={n === 4 ? 'rate' : undefined}>{n}</i>)}</div>
                  <small>Strongly disagree<span>Strongly agree</span></small>
                </div>
                <div className="gr-ask-box">
                  <b>Sam’s question</b>
                  <p>{STORY.question}</p>
                  <div className={`gr-answer${answered ? ' is-sent' : ''}`} data-spot="answer">
                    {answer ? STORY.answer.slice(0, answer) : <span className="gr-ph">Your answer</span>}
                    {answering && <i className="gr-caret" />}
                    {answered && <Icon name="check" />}
                  </div>
                </div>
                <div className="gr-back">
                  <b>Got something to share back?</b>
                  <span className="gr-btn" data-spot="make">Make a gist</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="gr-inbox">
          <span className="gr-kicker" {...a('rise', 0.45, 0.5)}>Back with Sam</span>
          <h3 {...a('rise', 0.55, 0.6)}>What came back</h3>
          <div className="gr-stats" {...a('rise', 0.7, 0.6)}>
            {STATS.map(([label, steps]) => <Stat key={label} label={label} steps={steps} />)}
          </div>
          <ul className="gr-feed">
            {FEED.map(([at, who, icon, text], i) => (
              <li key={at} className={i === FEED.length - 1 ? 'is-loop' : ''} {...a('land-r', at, 0.55)}>
                <Avatar name={who} light />
                <p><b>{who.split(' ')[0]}</b> {text}</p>
                <Icon name={icon} />
              </li>
            ))}
          </ul>
        </div>
        <Doodle name="arrowShort" className="gr-hb-loop" at={LOOP + 0.05} d={0.45} strokeWidth={2} />
        <Pointer touch path={[[0.85, [420, 600]], [REACTED - 0.06, 'react'], [RATED - 0.06, 'rate'], [ANSWER - 0.3, 'answer'], [ANSWER + 0.45, [462, 512]], [LOOP - 0.12, 'make']]} presses={[REACTED, RATED, ANSWER - 0.24, LOOP]} />
      </div>
    </World>
  );
}

/* ------------------------------------------------------------------ the system */

const node = (id: string) => NODES.find((n) => n.id === id)!;
/** How many hops each node is from the hub: the diagram grows outward from Supabase. */
const HOPS: Record<string, number> = (() => {
  const hops: Record<string, number> = { base: 0 };
  for (let pass = 0; pass < NODES.length; pass++) {
    for (const [from, to] of EDGES) {
      if (hops[from] !== undefined && hops[to] === undefined) hops[to] = hops[from] + 1;
      if (hops[to] !== undefined && hops[from] === undefined) hops[from] = hops[to] + 1;
    }
  }
  return hops;
})();
const nodeAt = (id: string) => 0.55 + HOPS[id] * 0.5;
const TRACED = 4.1;

export function System() {
  const tracing = useAt((t) => (t < TRACED ? -1 : stepped(t, TRACE.map((_, i): [number, number] => [TRACED + i * 0.38, i]))));
  return (
    <World>
      <div {...a('out', 7.5, 0.5)}>
        <span className="gr-kicker gr-sys-kicker" {...a('rise', 0.2, 0.5)}>The system</span>
        <h2 className="gr-kinetic gr-sys-h" {...a('kinetic', 0.3, 0.7)}>One person. End to end.</h2>
        <svg className="gr-sys-svg" viewBox="0 0 1280 720" aria-hidden="true">
          {EDGES.map(([from, to], i) => {
            const A = node(from), B = node(to);
            // Drawn outward from whichever end appears first, with a slight bow.
            const [p, q] = HOPS[from] <= HOPS[to] ? [A, B] : [B, A];
            const bow = (i % 2 ? 1 : -1) * 0.1;
            const cx = (p.x + q.x) / 2 - (q.y - p.y) * bow, cy = (p.y + q.y) / 2 + (q.x - p.x) * bow;
            const d = `M${p.x} ${p.y}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${q.x} ${q.y}`;
            const start = nodeAt(p.id);
            const step = TRACE.indexOf(from);
            const traced = step >= 0 && TRACE[step + 1] === to;
            return (
              <g key={`${from}-${to}`}>
                <path className="gr-sys-edge" pathLength={1} d={d} {...a('draw', start + 0.1, 0.45)} />
                <path className="gr-sys-flow" d={d} {...a('fade', start + 0.5, 0.5)} />
                {traced && <path className="gr-sys-trace" pathLength={1} d={`M${A.x} ${A.y}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${B.x} ${B.y}`} {...a('draw', TRACED + step * 0.38, 0.4)} />}
              </g>
            );
          })}
        </svg>
        {NODES.map((n) => (
          <div key={n.id} className={`gr-sys-node${n.hub ? ' is-hub' : ''}${TRACE.indexOf(n.id) >= 0 && TRACE.indexOf(n.id) <= tracing ? ' is-lit' : ''}`} style={{ left: n.x, top: n.y }}>
            <div {...a('pop', nodeAt(n.id), 0.45)}><b>{n.label}</b>{n.sub && <span>{n.sub}</span>}</div>
          </div>
        ))}
        <span className="gr-sys-tag" {...a('pop', TRACED - 0.25, 0.4)}>the path of one gist</span>
        <div className="gr-sys-tags" {...a('rise', 5.7, 0.5)}>
          {['Vite', 'React', 'TypeScript', 'Supabase', 'Stripe', 'Vercel'].map((tag) => <i key={tag}>{tag}</i>)}
        </div>
      </div>
    </World>
  );
}
