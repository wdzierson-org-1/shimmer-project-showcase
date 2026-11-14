import { ArrowRight } from 'lucide-react';
import { Wordmark } from '../art';
import { a, useAt } from '../clock';
import { EDGES, NODES, STORY, TRACE, type SystemNode } from '../timeline';
import { Hud, World } from './frame';

/* The scenes with no app in them: the opening, the system, and the close. */

/** Things saved and lost: [kind, the name it was saved under, x, y, degrees]. */
const LOST: [string, string, number, number, number][] = [
  ['link', STORY.short, 96, 118, -3],
  ['screenshot', 'Screenshot 2026-10-02 at 11.42 PM.png', 700, 86, 2.5],
  ['voice', 'New Recording 14.m4a', 930, 214, -4],
  ['pdf', '2307.03172.pdf', 140, 468, 3],
  ['photo', 'IMG_4821.HEIC', 842, 520, -2],
  ['link', 'github.com/charmbracelet/gum', 420, 590, 1.5],
  ['tab', 'still open, somewhere', 900, 392, 4],
];
const GATHER = 2.7;

export function Hook() {
  return (
    <World>
      <div {...a('out', 6.5, 0.5)}>
        <div className="sx-hook-a" {...a('out', GATHER + 0.1, 0.35)}>
          <h2 className="sx-big sx-hook-q" {...a('kinetic', 0.35, 0.6)}>You saved it.</h2>
          <h2 className="sx-big sx-hook-q is-2" {...a('kinetic', 1.35, 0.6)}>Somewhere.</h2>
        </div>
        {LOST.map(([kind, name, x, y, deg], i) => (
          <span key={name} className="sx-lost" style={{ left: x, top: y, rotate: `${deg}deg` }}>
            <span {...a('sink', GATHER + i * 0.07, 0.4)}>
              <span className="sx-tag sx-lost-tag" {...a('print', 0.25 + i * 0.26, 0.24)}><i>{kind}:</i> {name}</span>
            </span>
          </span>
        ))}
        {STORY.promise.map((line, i) => (
          <h2 key={line} className="sx-big sx-hook-h" {...a('kinetic', 3.3 + i * 0.32, 0.7, { top: 132 + i * 104 })}>{line}</h2>
        ))}
        <p className="sx-hook-lead" {...a('rise', 4.5, 0.6)}>
          Drop in a link, a screenshot, a TikTok. Stash gathers the background, so later you can ask about it in your own words and take it anywhere.
        </p>
        <span className="sx-hook-next"><span className="sx-tag sx-lost-tag" {...a('print', 5.3, 0.24)}><i>link:</i> {STORY.short}</span></span>
      </div>
    </World>
  );
}

/* ------------------------------------------------------------------ the system */

const byId = Object.fromEntries(NODES.map((n) => [n.id, n])) as Record<string, SystemNode>;
/** How many steps each node is from the hub: it appears that many beats in. */
const HOPS: Record<string, number> = {};
{
  const hub = NODES.find((n) => n.hub) ?? NODES[0];
  HOPS[hub.id] = 0;
  for (let grew = true; grew;) {
    grew = false;
    for (const [from, to] of EDGES) {
      for (const [p, q] of [[from, to], [to, from]]) if (HOPS[p] !== undefined && HOPS[q] === undefined) { HOPS[q] = HOPS[p] + 1; grew = true; }
    }
  }
}
const nodeAt = (id: string) => 0.5 + (HOPS[id] ?? 0) * 0.55 + (NODES.findIndex((n) => n.id === id) % 4) * 0.07;
const TRACE_AT = 4.3, TRACE_STEP = 0.5;
/** The nodes the trace reaches, in the order it reaches them. */
const REACHED = [TRACE[0][0], ...TRACE.map(([, to]) => to)];

export function System() {
  const lit = useAt((t) => (t < TRACE_AT ? 0 : Math.min(REACHED.length, 1 + Math.floor((t - TRACE_AT) / TRACE_STEP))));
  return (
    <>
      <World>
        <div {...a('out', 7.9, 0.55)}>
          <svg className="sx-sys-lines" viewBox="0 0 1280 720">
            {EDGES.map(([from, to]) => {
              const p = byId[from], q = byId[to];
              const step = TRACE.findIndex(([f, t]) => f === from && t === to);
              const d = `M${p.x} ${p.y} L${q.x} ${q.y}`;
              return (
                <g key={`${from}-${to}`}>
                  <path d={d} pathLength={1} className="sx-sys-edge" {...a('draw', Math.min(nodeAt(from), nodeAt(to)) + 0.25, 0.5)} />
                  {step >= 0 && <path d={d} pathLength={1} className="sx-sys-trace" {...a('draw', TRACE_AT + step * TRACE_STEP, TRACE_STEP)} />}
                </g>
              );
            })}
          </svg>
          {NODES.map((n) => (
            <div key={n.id} className="sx-sys-at" style={{ left: n.x, top: n.y }}>
              <div className={`sx-sys-node${n.hub ? ' is-hub' : ''}${REACHED.indexOf(n.id) >= 0 && REACHED.indexOf(n.id) < lit ? ' is-lit' : ''}`} {...a('node', nodeAt(n.id), 0.45)}>
                <b>{n.label}</b>
                {n.sub && <span>{n.sub}</span>}
              </div>
            </div>
          ))}
        </div>
      </World>
      <Hud>
        <div {...a('out', 7.9, 0.5)}>
          <span className="sx-tag is-spot sx-sys-title" {...a('print', 0.3, 0.24)}>the system</span>
          <span className="sx-px sx-sys-note" {...a('fade', TRACE_AT, 0.5)}>one save: phone → edge function → database + models</span>
        </div>
      </Hud>
    </>
  );
}

/* ------------------------------------------------------------------ the close */

/** The closing card. It uses only a(), so it also serves as the poster, with its times in the past. */
export function ClosingCard({ at }: { at: number }) {
  return (
    <div className="sx-close">
      <h2 className="sx-big sx-close-h" {...a('kinetic', at + 0.3, 0.7)}>Stash is smarter</h2>
      <h2 className="sx-big sx-close-h is-2" {...a('kinetic', at + 0.62, 0.7)}>saving.</h2>
      <span className="sx-btn sx-close-go" {...a('print', at + 2.6, 0.3)}>{STORY.site}<ArrowRight size={16} /></span>
      <span className="sx-px sx-close-price" {...a('fade', at + 3.0, 0.5)}>$4.99 a month.</span>
      {/* Where WebGL is missing, the mark the dots would have made. */}
      <div className="sx-close-mark" {...a('print', at + 1.4, 0.5)}><Wordmark /></div>
    </div>
  );
}

export function Close() {
  return <World><ClosingCard at={0} /></World>;
}
