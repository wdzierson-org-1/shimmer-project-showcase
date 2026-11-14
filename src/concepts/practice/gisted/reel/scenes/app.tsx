import { useContext, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { AliveThumb, Avatar, Doodle, Icon, Pointer, Wordmark } from '../art';
import { a, SceneContext, useAt, vars } from '../clock';
import { clamp, ITEM, seeded, stepped, STORY, typed, WIN } from '../timeline';

/* The four scenes that happen inside the app: paste, the findings, your take, and sending.
   They copy the product's own screens at 1100 px wide; everything that moves is scrubbed. */

/** The part of a scene the camera moves over. */
export function World({ children, className }: { children: ReactNode; className?: string }) {
  const scene = useContext(SceneContext);
  return <div ref={scene?.world} className={`gr-world${className ? ` ${className}` : ''}`}>{children}</div>;
}
/** The part of a scene that stays put on screen. */
export const Hud = ({ children }: { children: ReactNode }) => <div className="gr-hud">{children}</div>;

const BODY = { x: WIN.x, y: WIN.y + WIN.bar + WIN.head };

function WinBar({ path }: { path: string }) {
  return (
    <div className="gr-win-bar">
      <i /><i /><i />
      <span className="gr-win-url"><Icon name="lock" />gisted.co{path}</span>
    </div>
  );
}

const STEPS = ['Get the gist', 'Customize', 'Send'];
function StepHead({ step, action, ready = true, crumb, saved }: { step: 1 | 2 | 3; action: string; ready?: boolean; crumb?: boolean; saved?: string }) {
  return (
    <div className="gr-head">
      <Wordmark className="gr-head-mark" />
      {crumb && <span className="gr-crumb"><i>/</i>{STORY.title}{saved && <em>{saved}</em>}</span>}
      <span className="gr-steps">
        {STEPS.map((label, i) => {
          const n = i + 1;
          return (
            <span key={label} className={`gr-step${n < step ? ' is-done' : ''}${n === step ? ' is-on' : ''}`}>
              <i>{n < step ? <Icon name="check" /> : n}</i>{label}{n < 3 && <b />}
            </span>
          );
        })}
      </span>
      <span className="gr-head-actions">
        <span className="gr-btn gr-btn--line">Back</span>
        <span className={`gr-btn${ready ? '' : ' is-off'}`} data-spot="head-action">{action}</span>
        <Avatar name="Sam Rivera" />
      </span>
    </div>
  );
}

/** The thing being shared, at the centre of step 1. Until its details arrive it shows the bare link. */
function ItemCard({ metaAt, artOutAt, artInAt }: { metaAt?: number; artOutAt?: number; artInAt?: number }) {
  const waiting = metaAt !== undefined;
  return (
    <article className="gr-item" style={{ left: ITEM.x - BODY.x, top: ITEM.y - BODY.y, width: ITEM.w }}>
      <div className="gr-item-media">
        {waiting && <span className="gr-item-scan" />}
        <div className="gr-item-art" {...(waiting ? a('fade', metaAt, 0.5) : {})}>
          <AliveThumb art={artOutAt !== undefined ? a('out', artOutAt, 0.55) : artInAt !== undefined ? a('fade', artInAt, 0.7) : undefined} />
        </div>
      </div>
      <div className="gr-item-body">
        <span className="gr-item-site"><Icon name="play" />YouTube</span>
        {waiting ? (
          <>
            <b className="gr-item-title gr-item-url" {...a('out', metaAt, 0.3)}>{STORY.url}</b>
            <b className="gr-item-title gr-item-real" {...a('fade', metaAt + 0.1, 0.4)}>{STORY.title}</b>
            <span className="gr-item-by" {...a('fade', metaAt + 0.2, 0.4)}>{STORY.channel}, {STORY.duration}</span>
          </>
        ) : (
          <>
            <b className="gr-item-title">{STORY.title}</b>
            <span className="gr-item-by">{STORY.channel}, {STORY.duration}</span>
          </>
        )}
      </div>
    </article>
  );
}

function StatusPill({ done, children }: { done?: boolean; children: ReactNode }) {
  return (
    <div className="gr-status">
      <span className={`gr-pill${done ? ' is-done' : ''}`}>
        {done ? <Icon name="check" /> : <Doodle name="spinner" className="gr-spin" />}
        {children}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ 1. paste */

const EXAMPLES: [string, string, string][] = [
  ['video', 'YouTube', 'Quantum immortality'], ['book', 'Book', 'Contagious, by Jonah Berger'], ['slides', 'Slides', 'Onboarding redesign, Q1'],
  ['lines', 'PDF', 'Lost in the Middle'], ['link', 'Health', 'Seven hours is the floor'], ['pin', 'TikTok', 'A rooftop stay in Lisbon'], ['pot', 'TikTok', '20-minute penne'],
];

export function Paste() {
  const pasted = useAt((t) => t >= 2.05);
  const focused = useAt((t) => t >= 1.62 && t < 3.7);
  const busy = useAt((t) => t >= 3.4);
  const reading = useAt((t) => t >= 3.75);
  const status = useAt((t) => (t < 4.75 ? 'Opening the video' : 'Reading it closely'));
  return (
    <World>
      <div className="gr-win" {...a('window', 0.05, 0.95)}>
        <WinBar path={reading ? '/create' : ''} />
        <div className="gr-screen" {...a('out', 3.62, 0.3)}>
          <div className="gr-head">
            <Wordmark className="gr-head-mark" />
            <span className="gr-nav"><span>How it works</span><span><Icon name="browser" />Chrome extension</span><span>Sign in</span><span className="gr-btn">Get started</span></span>
          </div>
          <div className="gr-body gr-grid gr-home">
            <Doodle name="sparkle" className="gr-home-d gr-home-d--spark" at={0.7} d={0.7} />
            <Doodle name="bubble" className="gr-home-d gr-home-d--bubble" at={0.85} d={0.8} />
            <Doodle name="confetti" className="gr-home-d gr-home-d--confetti" />
            <Doodle name="star" className="gr-home-d gr-home-d--star" at={1.0} d={0.7} />
            <Doodle name="arrow" className="gr-home-d gr-home-d--arrow" at={1.0} d={0.9} />
            <Doodle name="smiley" className="gr-home-d gr-home-d--smiley" at={1.15} d={0.8} />
            <h2 className="gr-home-h" {...a('rise', 0.3, 0.7)}>Don’t just send a link.<br />Send the gist.</h2>
            <p className="gr-home-sub" {...a('rise', 0.42, 0.7)}>Paste a video, article, recipe or doc. Gisted pulls out what matters, helps you add your take, and turns it into a page people actually open, and answer.</p>
            <b className="gr-home-now" {...a('rise', 0.52, 0.7)}>Get started now</b>
            <div className={`gr-composer${focused ? ' is-focus' : ''}`} {...a('rise', 0.58, 0.7)}>
              <p className="gr-composer-text" data-spot="composer">
                {pasted
                  ? <span className="gr-pasted" {...a('paste', 2.05, 0.5)}>https://{STORY.url}</span>
                  : <span className="gr-ph">Paste a link, start a note, or drop a file</span>}
                {focused && <i className="gr-caret" />}
              </p>
              <div className="gr-composer-row">
                <span className="gr-ghost"><Icon name="clip" />Add a file</span>
                <span className="gr-source" {...a('rise', 2.3, 0.4)}><Icon name="link" />A link from {STORY.host}</span>
                <span className={`gr-btn${pasted ? '' : ' is-off'}`} data-spot="go">{busy ? <><Doodle name="spinner" className="gr-spin" />Opening</> : 'Get the gist'}</span>
              </div>
              <span className="gr-kbd" {...a('key', 1.85, 0.75)}>⌘V</span>
            </div>
            <div className="gr-examples" {...a('rise', 0.7, 0.7)}>
              <span>Or pick an example</span>
              {EXAMPLES.map(([icon, type, title]) => <i key={title}><b><Icon name={icon} /></b><span><small>{type}</small>{title}</span></i>)}
            </div>
          </div>
        </div>
        <div className="gr-screen" {...a('fade', 3.72, 0.4)}>
          <StepHead step={1} action="Customize" ready={false} />
          <div className="gr-body gr-grid">
            <StatusPill>{status}</StatusPill>
            <ItemCard metaAt={4.6} artOutAt={5.5} />
          </div>
        </div>
      </div>
      <Pointer path={[[0.95, [1020, 640]], [1.52, 'composer'], [2.0, [716, 398]], [3.2, 'go'], [5.0, [900, 560]]]} presses={[1.6, 3.38]} />
    </World>
  );
}

/* ------------------------------------------------------------------ 2. the findings */

interface Card { side: 'l' | 'r'; icon: string; label: string; body: ReactNode; suggest?: boolean }
const CARDS: Card[] = [
  { side: 'l', icon: 'info', label: 'What it is', body: <p>An explainer on quantum immortality from Strange Loops</p> },
  { side: 'r', icon: 'sparkle', label: 'Summary', body: <p>If many-worlds is true, a quantum-triggered gun can never kill you from your own point of view. Clever, untestable, and probably not about real death.</p> },
  { side: 'l', icon: 'clock', label: 'Key moments', body: <><ul><li><b>1:10</b>Many worlds in two minutes</li><li><b>4:40</b>The quantum suicide experiment</li><li><b>10:05</b>Why it doesn’t cover ordinary death</li></ul><small>3 more</small></> },
  { side: 'r', icon: 'lines', label: 'Transcript', body: <p>About 2,200 words, timestamped</p> },
  { side: 'l', icon: 'image', label: 'Diagram on screen', body: <p>A tree that splits at every round: one branch goes on, one ends</p> },
  { side: 'r', icon: 'users', label: 'Mentions', body: <span className="gr-chips">{['Hugh Everett', 'Hans Moravec', 'Bruno Marchal', 'Max Tegmark', 'Schrödinger’s cat'].map((name) => <i key={name}>{name}</i>)}</span> },
  { side: 'l', icon: 'bulb', label: 'The catch', body: <p>Real death is gradual, everyone else sees the gun fire, and nobody else can ever be convinced</p> },
  { side: 'r', icon: 'branch', label: 'The experiment as a diagram', suggest: true, body: <p>A branching tree you can take in at a glance, because the idea is easier to see than to read.</p> },
  { side: 'l', icon: 'list', label: 'A short glossary', suggest: true, body: <p>Many-worlds, superposition, decoherence and the Born rule, in plain words.</p> },
  { side: 'r', icon: 'link', label: 'Further reading', suggest: true, body: <p>Tegmark’s paper, the Stanford Encyclopedia entry and an overview of the debate.</p> },
];
const cardAt = (i: number) => 1.2 + i * 0.36;
const READY = cardAt(CARDS.length - 1) + 0.6;
const STATUS: [number, string][] = [
  [0, 'Reading it closely'],
  ...CARDS.slice(0, 7).map((_, i): [number, string] => [cardAt(i), `Found ${i + 1} ${i ? 'things' : 'thing'} so far`]),
  [cardAt(7), 'Looking for things worth adding'], [READY, 'Ready'],
];

interface Leader { d: string; x1: number; y1: number; x2: number; y2: number }

/** Where an element sits inside `root`, in layout px (so entrance transforms don't move the lines). */
function offsetIn(el: HTMLElement, root: HTMLElement) {
  let x = 0, y = 0;
  let node: HTMLElement | null = el;
  while (node && node !== root) { x += node.offsetLeft; y += node.offsetTop; node = node.offsetParent as HTMLElement | null; }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight };
}

export function Board() {
  const body = useRef<HTMLDivElement>(null);
  const [leaders, setLeaders] = useState<(Leader | null)[]>([]);
  const status = useAt((t) => stepped(t, STATUS));
  const done = useAt((t) => t >= READY);

  // Leaders are drawn like annotation lines in a notebook: a loose curve from the item to each finding.
  useLayoutEffect(() => {
    const root = body.current;
    if (!root) return;
    const measure = () => {
      const item = root.querySelector<HTMLElement>('.gr-item');
      if (!item) return;
      const c = offsetIn(item, root);
      const top = c.y, bottom = c.y + c.h;
      setLeaders(CARDS.map((card, i) => {
        const el = root.querySelector<HTMLElement>(`[data-card="${i}"]`);
        if (!el) return null;
        const n = offsetIn(el, root);
        const left = card.side === 'l';
        const rnd = seeded(i * 97 + 11);
        const wobble = () => (rnd() - 0.5) * 12;
        const x2 = left ? n.x + n.w + 4 : n.x - 4, y2 = n.y + 17;
        let x1: number, y1: number, d: string;
        if (y2 > bottom + 18 || y2 < top - 18) {
          // Findings well above or below the item leave from its top or bottom edge, fanned out by distance.
          const below = y2 > bottom;
          const reach = clamp(Math.abs(y2 - (below ? bottom : top)) / 150);
          x1 = left ? c.x + 12 + (1 - reach) * 60 : c.x + c.w - 12 - (1 - reach) * 60;
          y1 = below ? bottom + 4 : top - 4;
          const dy = (y2 - y1) * 0.9;
          d = `M${x1.toFixed(1)} ${y1.toFixed(1)} C${(x1 + wobble()).toFixed(1)} ${(y1 + dy).toFixed(1)} ${((x1 + x2) / 2).toFixed(1)} ${(y2 + wobble() * 0.4).toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
        } else {
          x1 = left ? c.x - 4 : c.x + c.w + 4;
          y1 = clamp(y2 + (rnd() - 0.5) * 26, top + 28, bottom - 28);
          const dx = (x2 - x1) * 0.52;
          d = `M${x1.toFixed(1)} ${y1.toFixed(1)} C${(x1 + dx).toFixed(1)} ${(y1 + wobble()).toFixed(1)} ${(x2 - dx).toFixed(1)} ${(y2 + wobble()).toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
        }
        return { d, x1, y1, x2, y2 };
      }));
    };
    measure();
    let live = true;
    document.fonts?.ready.then(() => { if (live) measure(); }).catch(() => {});
    return () => { live = false; };
  }, []);

  const column = (side: 'l' | 'r') => (
    <div className={`gr-col gr-col--${side}`}>
      {CARDS.map((card, i) => card.side === side && (
        <div key={card.label} data-card={i} className={`gr-node${card.suggest ? ' is-suggest' : ''}`} {...a(side === 'l' ? 'land-l' : 'land-r', cardAt(i), 0.5)}>
          <div className="gr-node-head"><Icon name={card.icon} /><span>{card.label}</span>{card.suggest && <em>Can add</em>}</div>
          <div className="gr-node-body">{card.body}</div>
        </div>
      ))}
    </div>
  );

  return (
    <World>
      <div className="gr-win">
        <WinBar path="/create" />
        <div className="gr-screen">
          <StepHead step={1} action="Customize" ready={done} crumb />
          <div className="gr-body gr-grid" ref={body}>
            <StatusPill done={done}>{status}</StatusPill>
            <svg className="gr-leaders" aria-hidden="true">
              {leaders.map((l, i) => l && (
                <g key={i}>
                  <path className={`gr-leader${CARDS[i].suggest ? ' is-dashed' : ''}`} d={l.d} pathLength={CARDS[i].suggest ? undefined : 1} {...a(CARDS[i].suggest ? 'fade' : 'draw', cardAt(i) - 0.34, 0.4)} />
                  <circle className="gr-leader-dot" r={2.6} cx={l.x1} cy={l.y1} {...a('fade', cardAt(i) - 0.34, 0.15)} />
                  <circle className="gr-leader-dot" r={2.6} cx={l.x2} cy={l.y2} {...a('fade', cardAt(i), 0.15)} />
                </g>
              ))}
            </svg>
            {leaders.map((l, i) => l && <i key={i} className="gr-runner" {...a('run', cardAt(i) - 0.34, 0.4, { offsetPath: `path('${l.d}')` })} />)}
            {column('l')}
            <ItemCard artInAt={0.3} />
            {column('r')}
            <div className="gr-foot" {...a('rise', READY + 0.1, 0.5)}>
              <p>{STORY.found}</p>
              <span className="gr-btn" data-spot="customize">Customize<Icon name="arrowRight" /></span>
            </div>
          </div>
        </div>
      </div>
      <Pointer path={[[READY + 0.5, [980, 610]], [READY + 1.25, 'customize']]} presses={[READY + 1.45]} />
    </World>
  );
}

/* ------------------------------------------------------------------ 3. your take */

const RAIL: [string, string, string][] = [
  ['branch', 'The experiment as a diagram', 'A branching tree you can take in at a glance, because the idea is easier to see than to read.'],
  ['list', 'A short glossary', 'Many-worlds, superposition, decoherence and the Born rule, in plain words.'],
  ['link', 'Further reading', 'Tegmark’s paper, the Stanford Encyclopedia entry and an overview of the debate.'],
  ['chat', 'Questions to argue about', 'Four prompts that give the conversation somewhere to go.'],
];
const ADD = 4.55;
const DRAWN = ADD + 0.55;

/** The thought experiment as a tree: at every round one branch goes on and one ends. */
function Tree() {
  const rounds = [
    { x: 96, y: 92, up: [214, 54], down: [214, 132] },
    { x: 214, y: 54, up: [332, 30], down: [332, 86] },
    { x: 332, y: 30, up: [452, 18], down: [452, 56] },
  ];
  return (
    <svg className="gr-tree" viewBox="0 0 552 168" aria-hidden="true">
      <path className="gr-tree-live" pathLength={1} d="M18 92C44 90 70 93 96 92" {...a('draw', DRAWN, 0.3)} />
      {rounds.map((r, i) => {
        const t = DRAWN + 0.3 + i * 0.55;
        const [ux, uy] = r.up, [dx, dy] = r.down;
        return (
          <g key={i}>
            <circle className="gr-tree-node" cx={r.x} cy={r.y} r={4.5} {...a('pop', t - 0.05, 0.3)} />
            <path className="gr-tree-live" pathLength={1} d={`M${r.x} ${r.y}C${r.x + 40} ${r.y - 2} ${ux - 44} ${uy + 3} ${ux} ${uy}`} {...a('draw', t, 0.45)} />
            <path className="gr-tree-dead" pathLength={1} d={`M${r.x} ${r.y}C${r.x + 38} ${r.y + 3} ${dx - 46} ${dy - 2} ${dx - 8} ${dy}`} {...a('draw', t + 0.08, 0.45)} />
            <path className="gr-tree-x" d={`M${dx - 4} ${dy - 5}l9 10M${dx + 5} ${dy - 5}l-9 10`} {...a('pop', t + 0.5, 0.25)} />
            <text className="gr-tree-round" x={r.x} y={r.y + 24} textAnchor="middle" {...a('fade', t, 0.3)}>Round {i + 1}</text>
          </g>
        );
      })}
      <circle className="gr-tree-node is-you" cx={452} cy={18} r={5} {...a('pop', DRAWN + 1.9, 0.3)} />
      <text className="gr-tree-label" x={466} y={22} {...a('fade', DRAWN + 1.95, 0.4)}>the only branch</text>
      <text className="gr-tree-label" x={466} y={36} {...a('fade', DRAWN + 2.0, 0.4)}>you ever see</text>
      <text className="gr-tree-note" x={270} y={150} textAnchor="middle" {...a('fade', DRAWN + 1.2, 0.5)}>one branch goes on · one ends</text>
    </svg>
  );
}

export function Customize() {
  const take = useAt((t) => typed(STORY.take, t, 1.25, 24).length);
  const typing = useAt((t) => t >= 1.05 && t < 3.5);
  const writing = useAt((t) => t >= ADD && t < ADD + 0.5);
  const added = useAt((t) => t >= ADD + 0.5);
  return (
    <World>
      <div className="gr-exit" {...a('leave', 9.95, 0.45)}>
        <div className="gr-win" {...a('fade', 0, 0.35)}>
          <WinBar path="/create/customize" />
          <div className="gr-screen">
            <StepHead step={2} action="Continue" crumb saved="Saved" />
            <div className="gr-body gr-grid gr-cz" {...a('slide', 0.05, 0.6)}>
              <div className="gr-cz-tabs"><span className="is-on"><Icon name="lines" />Page</span><span><Icon name="video" />Video<em>Pro</em></span></div>
              <span className="gr-cz-preview"><Icon name="eye" />Preview as a reader</span>
              <div className="gr-sheet">
                <div className="gr-sheet-scroll" {...a('scroll', ADD + 0.25, 0.8, vars({ '--gr-by': '-158px' }))}>
                  <h2>{STORY.title}</h2>
                  <p className="gr-sheet-dek">{STORY.dek}</p>
                  <div className={`gr-take${typing ? ' is-focus' : ''}`} data-spot="take">
                    <Doodle name="quote" className="gr-take-quote" />
                    <Doodle name="arrowShort" className="gr-take-arrow" at={0.5} d={0.7} />
                    <div className="gr-take-who"><Avatar name="Sam Rivera" /><b>Your take</b><span>The first thing people read</span></div>
                    {take
                      ? <p className="gr-take-text">{STORY.take.slice(0, take)}{typing && <i className="gr-caret" />}</p>
                      : <p className="gr-take-text gr-ph">Why are you sharing this? A line or two is plenty.{typing && <i className="gr-caret" />}</p>}
                    <div className="gr-starters"><span>Start with</span><i>Fourteen minutes that broke my brain a little.</i><i>Do you buy this? I can’t decide.</i></div>
                  </div>
                  <section className="gr-added" {...a('grow', ADD + 0.2, 0.6)}>
                    <div className="gr-added-in">
                      <h3>The experiment as a diagram{writing && <small><Doodle name="spinner" className="gr-spin" />Drawing…</small>}{added && <small className="is-by">Drawn by Gisted</small>}</h3>
                      <div className="gr-added-art"><Tree /></div>
                    </div>
                  </section>
                  <div className="gr-sheet-media"><AliveThumb /></div>
                </div>
              </div>
              <aside className="gr-rail">
                <h4>Add to your gist</h4>
                <small>Picked for this video</small>
                {RAIL.map(([icon, title, why], i) => (
                  <div key={title} className="gr-sugg" {...a('rise', 0.25 + i * 0.07, 0.5)}>
                    <span className="gr-sugg-ico"><Icon name={icon} /></span>
                    <div><b>{title}</b><p>{why}</p></div>
                    {i === 0 && (writing || added)
                      ? <span className="gr-added-tag">{added ? <><Icon name="check" />Added</> : <Doodle name="spinner" className="gr-spin" />}</span>
                      : <span className="gr-btn gr-btn--line gr-btn--sm" data-spot={i === 0 ? 'add' : undefined}><Icon name="plus" />Add</span>}
                  </div>
                ))}
                <div className="gr-ask" {...a('rise', 0.6, 0.5)}>
                  <b><Icon name="chat" />Ask Gisted</b>
                  <p>I pulled out a summary, the key moments, where the idea comes from and the catch. I can also draw the experiment, add a glossary, or find further reading.</p>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </div>
      <Pointer path={[[0.45, [980, 600]], [1.0, 'take'], [1.75, [704, 452]], [ADD - 0.15, 'add'], [5.5, [1010, 470]], [9.45, 'head-action']]} presses={[1.08, ADD, 9.62]} />
    </World>
  );
}

/* ------------------------------------------------------------------ 4. send */

const TABS: [string, string][] = [['link', 'Link'], ['mail', 'Email'], ['linkedin', 'LinkedIn post'], ['xlogo', 'X post']];
const OPTIONS: [string, string][] = [
  ['Reactions', 'One tap: love it, learned something, want to try it.'],
  ['Comments', 'A conversation on the page, about the whole thing or one section.'],
  ['A rating scale', 'People rate a statement, from strongly disagree to strongly agree.'],
  ['Your questions', 'Ask what you want to know.'],
];
const TAB = 1.15, ASK = 3.95, COPY = 5.42;

export function Send() {
  const x = useAt((t) => t >= TAB);
  const post = useAt((t) => typed(STORY.post, t, TAB + 0.2, 104).length);
  const asking = useAt((t) => t >= ASK);
  const sent = useAt((t) => t >= COPY);
  const text = STORY.post.slice(0, post);
  return (
    <World>
      <div className="gr-exit" {...a('send-off', 6.75, 0.75)}>
        <div className="gr-win" {...a('window', 0.05, 0.85)}>
          <WinBar path="/create/send" />
          <div className="gr-screen">
            <StepHead step={3} action="Done" crumb saved={sent ? 'Published' : 'Saved'} />
            <div className="gr-body gr-grid gr-send">
              <div className="gr-send-main">
                <h2>Send it</h2>
                <p className="gr-send-sub">Pick how it goes out. Copying the link or a post, or sending the email, publishes the page.</p>
                <div className="gr-tabs">
                  {TABS.map(([icon, label], i) => <span key={label} className={(x ? i === 3 : i === 0) ? 'is-on' : ''} data-spot={i === 3 ? 'tab' : undefined}><Icon name={icon} />{label}</span>)}
                </div>
                {x ? (
                  <div className="gr-compose" {...a('rise', TAB, 0.4)}>
                    <div className="gr-compose-write">
                      <div className="gr-seg"><span className="is-on">One post</span><span>A thread of three</span></div>
                      <p className="gr-textarea">{text}{post < STORY.post.length && <i className="gr-caret" />}</p>
                      <small>{post < STORY.post.length ? <><Doodle name="spinner" className="gr-spin" />Gisted is writing it</> : '197 of 280, with the link'}</small>
                    </div>
                    <div className="gr-preview">
                      <b>Preview</b>
                      <div className="gr-tweet">
                        <Avatar name="Sam Rivera" />
                        <div>
                          <span className="gr-tweet-who"><b>Sam Rivera</b>@samrivera</span>
                          <p>{text}</p>
                          <div className="gr-unfurl" {...a('rise', TAB + 1.0, 0.5)}>
                            <div className="gr-unfurl-media"><AliveThumb /></div>
                            <small>gisted.page</small><b>{STORY.title}</b>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="gr-linkrow"><span>{STORY.share}</span><span className="gr-btn"><Icon name="copy" />Copy link</span></div>
                )}
                <div className="gr-send-foot">
                  <span>{sent ? 'Your page is live. Anyone with the link can read it.' : 'Copying the post publishes the page.'}</span>
                  <span className="gr-btn" data-spot="copy"><Icon name={sent ? 'check' : 'copy'} />{sent ? 'Copied' : 'Copy post'}</span>
                </div>
              </div>
              <aside className="gr-send-side" {...a('left', 0.2, 0.6)}>
                <h4>Feedback<span className="gr-toggle"><i /></span><em>On</em></h4>
                <p>Choose how people can respond. Reading never needs an account.</p>
                {OPTIONS.map(([title, why], i) => {
                  const on = i < 2 || (i === 3 && asking);
                  return (
                    <div key={title} className="gr-option">
                      <span className={`gr-check${on ? ' is-on' : ''}`} data-spot={i === 3 ? 'ask' : undefined}>{on && <Icon name="check" />}</span>
                      <div><b>{title}</b><p>{why}</p>{i === 3 && asking && <q {...a('pop', ASK + 0.1, 0.4)}>{STORY.question}</q>}</div>
                    </div>
                  );
                })}
                <div className="gr-page-state">
                  <b>The page</b>
                  <span className={sent ? 'is-live' : ''} key={String(sent)} {...(sent ? a('pop', COPY, 0.4) : {})}>{sent ? <><Icon name="check" />Published</> : 'Not published yet'}</span>
                </div>
              </aside>
              <div className="gr-toast" {...a('toast', COPY + 0.1, 0.45)}><Icon name="check" />Copied. Your page is published.</div>
            </div>
          </div>
        </div>
      </div>
      <Pointer path={[[0.4, [1000, 610]], [TAB - 0.12, 'tab'], [3.1, [760, 430]], [ASK - 0.12, 'ask'], [COPY - 0.12, 'copy'], [6.6, [900, 600]]]} presses={[TAB, ASK, COPY]} />
    </World>
  );
}
