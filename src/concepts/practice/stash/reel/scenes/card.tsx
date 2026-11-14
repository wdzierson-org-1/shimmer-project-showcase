import type { CSSProperties, ReactNode } from 'react';
import { Decrypt, PixelImage, Pointer, Spinner, Symbol } from '../art';
import { FILM, resolve } from '../kit';
import { a, useAt } from '../clock';
import { CARD, SAVED, stepped, STORY } from '../timeline';
import { World } from './frame';

/* The save itself, and the card it becomes. The card follows the product's library card
   (DESIGN-v2 §12.3–12.4): the kind tag is the machine's status line while Stash reads, the picture is
   unresolved until it has been read, and dotted lines hold the place of what has not landed yet. */

const DOTS = '································';

/** A library card. `kind` is its tag; while Stash is reading, that tag is the cursor line. */
export function Card({ x, y, w, media, picture, kind, title, desc, m1, m2, ring, className, art, spot, children }: {
  x: number; y: number; w: number; media: number; picture: ReactNode; kind: ReactNode;
  title: ReactNode; desc?: ReactNode; m1: ReactNode; m2?: ReactNode;
  /** When it arrives: one spot ring fades off it. */
  ring?: number; className?: string; art?: { 'data-a': string; style: CSSProperties }; spot?: string; children?: ReactNode;
}) {
  return (
    <div className={`sx-card-at${className ? ` ${className}` : ''}`} style={{ left: x, top: y, width: w }}>
      <div className="sx-card" data-spot={spot} {...art}>
        <div className="sx-card-media" style={{ height: media }}>
          {picture}
          <span className="sx-tag sx-card-kind">{kind}</span>
        </div>
        <div className="sx-card-body">
          <h4 className="sx-card-title">{title}</h4>
          {desc !== undefined && <p className="sx-card-desc">{desc}</p>}
          <div className="sx-card-meta sx-px"><span>{m1}</span><span>{m2}</span></div>
        </div>
        {children}
      </div>
      {ring !== undefined && <i className="sx-card-ring" {...a('ring', ring + 0.3, 1.2)} />}
    </div>
  );
}

/* ------------------------------------------------------------------ 1. save */

const PHONE = { x: 190, y: 68 };
const SHARE = 2.0, STASH = 3.3, SAVED_AT = 4.0, ARRIVE = 4.7, PICTURE = 6.1;

const APPS: [string, string][] = [['Messages', 'is-msg'], ['Stash', 'is-stash'], ['Notes', 'is-notes'], ['Mail', 'is-mail']];

function Phone() {
  const sent = useAt((t) => t >= STASH);
  const saved = useAt((t) => t >= SAVED_AT);
  return (
    <div className="sx-phone" style={{ left: PHONE.x, top: PHONE.y }}>
      <div className="sx-phone-screen">
        <img src={`${FILM}shot-tiktok.jpg`} alt="" />
        <i className="sx-phone-share" data-spot="share" />
        <div className="sx-sheet-wrap" {...a('sink', 4.5, 0.35)}>
          <div className="sx-sheet" {...a('sheet', SHARE + 0.08, 0.45)}>
            <i className="sx-sheet-grab" />
            <div className="sx-sheet-item">
              <img src={`${FILM}shot-tiktok.jpg`} alt="" />
              <div><b>Tomato &amp; mozzarella penne</b><span>tiktok.com</span></div>
            </div>
            <ul className="sx-sheet-apps">
              {APPS.map(([name, cls]) => (
                <li key={name}>
                  <i className={`sx-sheet-app ${cls}`} data-spot={name === 'Stash' ? 'stash' : undefined}>{name === 'Stash' && <Symbol />}</i>
                  <span>{name}</span>
                </li>
              ))}
            </ul>
            <ul className="sx-sheet-rows"><li>Copy</li><li>Add to Reading List</li></ul>
            {sent && (
              <div className="sx-slip" {...a('print', STASH + 0.08, 0.26)}>
                <div className="sx-win-bar"><span><Symbol /> stash</span><span>{saved ? '✓' : ''}</span></div>
                <div className="sx-slip-body">
                  <span className="sx-px">{saved ? <><i className="sx-ok-ink">✓</i> saved</> : <><Spinner from={STASH} /> saving…</>}</span>
                  <em>Add a note</em>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <i className="sx-phone-island" />
    </div>
  );
}

export function Save() {
  const status = useAt((t) => stepped(t, [[0, 'saving…'], [5.5, 'gathering more info…']]));
  const reading = useAt((t) => t >= ARRIVE);
  return (
    <World>
      <div {...a('out', 8.55, 0.4)}>
        <div {...a('phone', 0.25, 0.8)}><Phone /></div>
        <div className="sx-crop sx-lib" {...a('fade', 0.5, 0.6)}>
          <i />
          <span className="sx-tag sx-lib-tag">your library</span>
          <span className="sx-px sx-lib-count">{reading ? <>60 saves · <Spinner from={ARRIVE} /> reading 1…</> : '59 saves'}</span>
        </div>
        <Card
          x={SAVED.x} y={SAVED.y} w={SAVED.w} media={SAVED.media} ring={ARRIVE} art={a('print', ARRIVE, 0.3)}
          picture={<PixelImage src={`${FILM}shot-tiktok.jpg`} w={SAVED.w} h={SAVED.media} focus={[0.5, 0.26]} block={resolve(PICTURE, 99)} />}
          kind={<><Spinner from={ARRIVE} /> {status}</>}
          title={<span className="sx-skel">{DOTS}</span>}
          desc={<><span className="sx-skel">{DOTS}</span><span className="sx-skel">{DOTS}</span></>}
          m1={STORY.host}
        />
        <Pointer touch path={[[1.2, [330, 560]], [SHARE - 0.15, 'share'], [STASH - 0.15, 'stash'], [STASH + 0.95, [404, 616]]]} presses={[SHARE, STASH]} />
      </div>
    </World>
  );
}

/* ------------------------------------------------------------------ 2. enriched */

const RES = 1.7, TITLE = 1.9, DONE = 2.9, KIND = 3.8, FIND = 5.5;
/** The picture is held at 12 px blocks while it is read, then sharpens 8 → 5 → 3 → 1 on the product's 110 ms beat. */
const sharpen = (t: number) => (t < RES ? 12 : [8, 5, 3][Math.floor((t - RES) / 0.11)] ?? 1);

interface NodeDef { side: 'L' | 'R'; y: number; label: string; body: ReactNode; from: number; note?: string }
const NODES: NodeDef[] = [
  { side: 'R', y: 104, label: 'what it is', body: STORY.what, from: 150 },
  { side: 'L', y: 104, label: 'ingredients', body: STORY.ingredients.join(', '), from: 170, note: 'each fact quoted from the source' },
  { side: 'R', y: 206, label: 'on-screen text', body: STORY.onScreen, from: 232 },
  { side: 'L', y: 232, label: 'creator', body: STORY.creator, from: 262 },
  { side: 'R', y: 288, label: 'summary', body: STORY.summary, from: 330 },
];
const nodeAt = (i: number) => 2.25 + i * 0.44;
const NODE_W = 252, LEFT_X = 150, RIGHT_X = 878;

export function Enriched() {
  const kind = useAt((t) => (t < DONE ? 'reading' : t < KIND ? 'done' : 'kind'));
  return (
    <World>
      <div {...a('out', 8.5, 0.5)}>
        <div className="sx-crop sx-en-stage" {...a('fade', 1.0, 0.6)}><i /></div>
        <svg className="sx-leaders" viewBox="0 0 1280 720">
          {NODES.map((n, i) => {
            const x0 = n.side === 'L' ? CARD.x : CARD.x + CARD.w, x1 = n.side === 'L' ? LEFT_X + NODE_W : RIGHT_X;
            const y0 = n.from, y1 = n.y + 11, mid = (x0 + x1) / 2;
            const d = `M${x0} ${y0} C${mid} ${y0} ${mid} ${y1} ${x1} ${y1}`;
            return (
              <g key={n.label}>
                <path d={d} pathLength={1} {...a('draw', nodeAt(i) - 0.3, 0.36)} />
                <circle r={2.6} cx={x0} cy={y0} {...a('fade', nodeAt(i) - 0.3, 0.1)} />
                <circle className="sx-spark" r={4} {...a('run', nodeAt(i) - 0.3, 0.4, { offsetPath: `path('${d}')` })} />
              </g>
            );
          })}
          <path d={`M640 ${CARD.y + 322} L640 458`} pathLength={1} {...a('draw', FIND - 0.3, 0.3)} />
        </svg>
        <Card
          x={CARD.x} y={CARD.y} w={CARD.w} media={CARD.media}
          picture={<PixelImage src={`${FILM}shot-tiktok.jpg`} w={CARD.w} h={CARD.media} focus={[0.5, 0.26]} block={sharpen} />}
          kind={kind === 'reading' ? <><Spinner /> gathering more info…</> : kind === 'done' ? <><i>✓</i> all done!</> : <Decrypt text="tiktok" at={KIND} d={0.3} />}
          title={<><Decrypt text={STORY.title} at={TITLE} d={0.8} /><span className="sx-skel" {...a('out', TITLE, 0.05)}>{DOTS}</span></>}
          desc={<><span {...a('print', 2.6, 0.26)}>{STORY.desc}</span><span className="sx-skel is-over" {...a('out', 2.6, 0.05)}>{DOTS}</span></>}
          m1={STORY.host} m2={<span {...a('fade', 2.9, 0.3)}>{STORY.length}</span>}
        />
        {NODES.map((n, i) => (
          <div key={n.label} className="sx-node-at" style={{ left: n.side === 'L' ? LEFT_X : RIGHT_X, top: n.y, width: NODE_W }}>
            <div className="sx-win sx-node" {...a('node', nodeAt(i), 0.45, { transformOrigin: n.side === 'L' ? 'right 11px' : 'left 11px' })}>
              <div className="sx-win-bar"><span>{n.label}</span><span>↳</span></div>
              <div className="sx-win-body">{n.body}</div>
            </div>
            {n.note && <span className="sx-px sx-node-note" {...a('fade', nodeAt(i) + 0.5, 0.4)}>{n.note}</span>}
          </div>
        ))}
        <div className="sx-node-at" style={{ left: 480, top: 458, width: 320 }}>
          <div className="sx-win sx-node is-find" {...a('node', FIND, 0.45, { transformOrigin: 'center top' })}>
            <div className="sx-win-bar"><span>find it by</span><span>search</span></div>
            <div className="sx-win-body">{STORY.findBy}</div>
          </div>
        </div>
      </div>
    </World>
  );
}
