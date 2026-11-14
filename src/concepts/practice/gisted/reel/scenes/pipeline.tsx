import { Doodle, Icon } from '../art';
import { a, useAt, vars } from '../clock';
import { PL, stepped, SWEEP_END, tileAt, tileRect, TILES, WRITE } from '../timeline';
import { Hud, World } from './app';

/* Under the hood: what gisted-enrich does between the click and the first finding. The words
   themselves are the WebGL particles; this scene draws the stations they pass through, and what
   each one decides. Every claim here is something the function does:
     read      readLink(): video details and the transcript are fetched together
     evidence  the reader's EvidenceDocument, with its coverage and method recorded
     write     the model's reply is scanned for JSON objects, each used as soon as it closes
     ground    an entity survives only if its quote is found in the source text
     check     a structural quality floor, with at most one bounded repair pass */

const STAGES = ['Read', 'Evidence', 'Write', 'Ground', 'Check'];
const STAGE_AT: [number, number][] = [[0, -1], [2.3, 0], [5.7, 1], [8.0, 2], [11.3, 3], [13.5, 4], [15.3, 5]];

const NAME = { finding: 'label', section: 'heading', suggestion: 'title' } as const;
const EVENTS: [number, string, string][] = [
  [8.1, 'start', '{ kind: "link", flavor: "youtube" }'],
  [8.4, 'context', '{ origin: "From the transcript", evidence }'],
  [8.75, 'meta', '{ title: "Quantum immortality, explained" }'],
  ...TILES.map((t, i): [number, string, string] => [tileAt(i), t.kind, `{ ${NAME[t.kind]}: "${t.label}" }`]),
  [15.3, 'done', '{ ms, model }'],
];
const EVENT_AT = EVENTS.map(([at], i): [number, number] => [at, i]);

const GROUND = 11.3;
const MENTIONS: [string, string][] = [
  ['Hugh Everett', '“…Everett’s 1957 thesis…”'],
  ['Hans Moravec', '“…Moravec proposed it in 1987…”'],
  ['Bruno Marchal', '“…and Marchal, a year later…”'],
  ['Max Tegmark', '“…Tegmark’s 1998 paper…”'],
  ['Schrödinger’s cat', '“…like the cat in the box…”'],
  ['Richard Feynman', 'no quote in the source'],
];
const PANEL = { x: 1730, y: 190, w: 430, row: 34, head: 34 };
const rowY = (i: number) => PANEL.y + PANEL.head + PANEL.row * (i + 0.5);
const quoteY = (i: number) => PL.page.y + 32 + i * 35;
const checkAt = (i: number) => GROUND + 0.5 + i * 0.2;
const DROP = GROUND + 1.6;

const CHECK = 13.5;
const FLOOR = ['2 sections of real substance', 'enough of it to be worth a page', 'a useful thing to add'];

export function Pipeline() {
  const stage = useAt((t) => stepped(t, STAGE_AT));
  const event = useAt((t) => (t < EVENTS[0][0] ? -1 : stepped(t, EVENT_AT)));
  const { page, gate, model, check, link } = PL;
  const [details, transcript] = PL.lanes;
  const pageRight = page.x + page.w + 8;

  return (
    <>
      <World>
        <div className="gr-pl" {...a('out', 16.0, 0.5)}>
          <svg className="gr-pl-svg" width={2700} height={720} viewBox="0 0 2700 720" aria-hidden="true">
            {/* The two readers' lanes, from the gate into the evidence. */}
            <path className="gr-pl-lane" d={`M${gate.x + gate.r} ${gate.y}Q${details.cx} ${details.cy} ${page.x - 8} ${page.y + 62}`} {...a('fade', 2.6, 0.8)} />
            <path className="gr-pl-lane" d={`M${gate.x + gate.r} ${gate.y}Q${transcript.cx} ${transcript.cy} ${page.x - 8} ${page.y + page.h - 62}`} {...a('fade', 2.6, 0.8)} />
            <g {...a('fade', 1.5, 0.6)}>
              <circle className="gr-pl-ring" cx={gate.x} cy={gate.y} r={gate.r} style={{ transformOrigin: `${gate.x}px ${gate.y}px`, transform: 'rotate(calc(var(--gr-t) * 16deg))' }} />
              <circle className="gr-pl-ring-in" cx={gate.x} cy={gate.y} r={gate.r - 9} />
            </g>
            {/* From the evidence, through the model, to what it writes. */}
            <path className="gr-pl-wire" d={`M${pageRight} ${PL.y}H${model.x - 26}M${model.x + 26} ${PL.y}H${PL.tile.x0 - 10}`} {...a('fade', 7.3, 0.6)} />
            {/* Grounding: each mention reaches back for its quote in the source. */}
            {MENTIONS.map(([name], i) => {
              const dropped = i === MENTIONS.length - 1;
              const at = dropped ? DROP : checkAt(i);
              const y = rowY(i), q = quoteY(i);
              return (
                <g key={name} {...a('out', GROUND + 2.15, 0.3)}>
                  <path className={`gr-pl-thread${dropped ? ' is-lost' : ''}`} pathLength={1} d={`M${PANEL.x - 6} ${y}C${PANEL.x - 130} ${y} ${pageRight + 150} ${q} ${pageRight + 4} ${q}`} {...a('draw', at, 0.34)} />
                  {dropped
                    ? <path className="gr-pl-miss" d={`M${pageRight - 5} ${q - 5}l10 10M${pageRight + 5} ${q - 5}l-10 10`} {...a('pop', at + 0.34, 0.25)} />
                    : <circle className="gr-pl-hit" cx={pageRight + 4} cy={q} r={3.4} {...a('pop', at + 0.3, 0.25)} />}
                </g>
              );
            })}
            <g {...a('fade', CHECK - 0.4, 0.6)}>
              <circle className="gr-pl-ring" cx={check.x} cy={check.y} r={check.r} style={{ transformOrigin: `${check.x}px ${check.y}px`, transform: 'rotate(calc(var(--gr-t) * -16deg))' }} />
              <circle className="gr-pl-ring-in is-pass" cx={check.x} cy={check.y} r={check.r - 9} {...a('fade', CHECK + 1.0, 0.4)} />
            </g>
          </svg>

          <div {...a('out', 8.3, 0.5)}>
            <div className="gr-pl-note" {...a('rise', 0.5, 0.6, { left: link.x, top: link.y - 62 })}><code>POST /functions/v1/gisted-enrich</code></div>
            <div className="gr-pl-note is-quiet" {...a('fade', 0.8, 0.6, { left: link.x, top: link.y + 34 })}>the link you pasted</div>

            <div className="gr-pl-label" {...a('rise', 1.6, 0.5, { left: gate.x - 34, top: gate.y - gate.r - 54 })}>
              <b>admission</b><span>signed ticket · rate limits · budget</span>
            </div>
            <div className="gr-pl-label" {...a('rise', 3.0, 0.5, { left: details.cx - 6, top: 124 })}>
              <b>{details.label}</b><span>{details.note}</span>
            </div>
            <div className="gr-pl-label" {...a('rise', 3.3, 0.5, { left: transcript.cx - 6, top: 520 })}>
              <b>{transcript.label}</b><span>{transcript.note}</span>
            </div>
            <div className="gr-pl-tag" {...a('pop', 3.6, 0.4, { left: 934, top: gate.y })}>read in parallel</div>
          </div>

          <div className="gr-pl-page" {...a('fade', 4.2, 0.9, { left: page.x - 8, top: page.y - 8, width: page.w + 16, height: page.h + 16 })}>
            <b>evidence document</b>
            {MENTIONS.slice(0, 5).map(([name], i) => <i key={name} {...a('flash', checkAt(i) + 0.26, 1.4, { top: quoteY(i) - page.y + 8 - 4, width: 74 + (i * 37) % 60 })} />)}
          </div>
          <dl className="gr-pl-read" style={{ left: page.x - 8, top: page.y + page.h + 22 }}>
            <div {...a('rise', 6.0, 0.4)}><dt>kind</dt><dd>youtube</dd></div>
            <div {...a('rise', 6.2, 0.4)}><dt>words</dt><dd>2,214</dd></div>
            <div {...a('rise', 6.4, 0.4)}><dt>coverage</dt><dd className="is-part">partial</dd></div>
            <p {...a('fade', 6.75, 0.5)}>Transcript read, visuals not inspected. The page will say so.</p>
          </dl>

          <div className="gr-pl-model" {...a('fade', 7.2, 0.6, { left: model.x - 22, top: model.y - model.h / 2, height: model.h })}>
            <b>Claude</b><span>streaming</span>
          </div>
          <i className="gr-pl-sweep" {...a('sweep', WRITE.t0, SWEEP_END - WRITE.t0, { left: page.x - 16, top: page.y - 12, height: page.h + 24, ...vars({ '--gr-bx': `${page.w + 32}px` }) })} />

          <ol className="gr-pl-events" {...a('fade', 8.1, 0.3, { left: PL.tile.x0, top: 84 })}>
            {[event - 2, event - 1, event].map((index, row) => index >= 0 && (
              <li key={index} className={row === 2 ? 'is-new' : ''}><em>event:</em> <b>{EVENTS[index][1]}</b> {EVENTS[index][2]}</li>
            ))}
          </ol>
          <span className="gr-pl-count" {...a('fade', tileAt(0), 0.3, { left: PL.tile.x0, top: 154 })}>7 findings</span>
          <span className="gr-pl-count" {...a('fade', tileAt(7), 0.3, { left: PL.tile.x0 + PL.tile.dx * 2, top: 154 })}>4 sections</span>
          <span className="gr-pl-count" {...a('fade', tileAt(11), 0.3, { left: PL.tile.x0 + PL.tile.dx * 3, top: 154 })}>3 things to add</span>

          <div {...a('dip', GROUND, 2.5)}>
            {TILES.map((t, i) => {
              const r = tileRect(t);
              return (
                <div key={i} className="gr-pl-slot" {...a('deliver', 15.0 + i * 0.04, 0.95, { left: r.x, top: r.y, width: r.w, height: r.h })}>
                  <i className="gr-pl-brace" {...a('brace', tileAt(i) - 0.12, 0.55)}>{'{ }'}</i>
                  <div className={`gr-pl-tile is-${t.kind}`} {...a('pop', tileAt(i), 0.4)}><Icon name={t.icon} /><b>{t.label}</b></div>
                </div>
              );
            })}
          </div>

          <div {...a('out', GROUND + 2.15, 0.3)}>
            <div className="gr-pl-panel" {...a('pop', GROUND, 0.45, { left: PANEL.x, top: PANEL.y, width: PANEL.w })}>
              <h5><Icon name="users" />Mentions<span>each needs its quote</span></h5>
              {MENTIONS.map(([name, quote], i) => {
                const dropped = i === MENTIONS.length - 1;
                const at = (dropped ? DROP : checkAt(i)) + 0.32;
                return (
                  <p key={name} className={dropped ? 'is-lost' : ''}>
                    <i {...a('pop', at, 0.25)}><Icon name={dropped ? 'x' : 'check'} /></i>
                    <b>{name}{dropped && <s {...a('strike', at + 0.05, 0.3)} />}</b>
                    <q {...a('fade', at - 0.2, 0.3)}>{quote}</q>
                  </p>
                );
              })}
            </div>
          </div>

          <div className="gr-pl-label" {...a('rise', CHECK - 0.2, 0.5, { left: check.x, top: check.y + check.r + 16 })}>
            <b>quality floor</b><span>else one repair pass, bounded</span>
          </div>
          <div className="gr-pl-floor" style={{ left: check.x + 78, top: check.y - 62 }}>
            {FLOOR.map((line, i) => <p key={line} {...a('rise', CHECK + 0.2 + i * 0.25, 0.35)}><Icon name="check" />{line}</p>)}
            <span {...a('pop', CHECK + 1.05, 0.4)}>passes<Doodle name="circle" at={CHECK + 1.05} d={0.5} /></span>
          </div>
        </div>
      </World>
      <Hud>
        <div className="gr-pl-title" {...a('rise', 0.2, 0.6)}>
          <div {...a('out', 15.9, 0.4)}><span>Under the hood</span><b>gisted-enrich</b><i>one edge function · streamed as server-sent events</i></div>
        </div>
        <div {...a('out', 15.9, 0.4)}>
          <ol className="gr-pl-rail" {...a('fade', 1.8, 0.5)}>
            {STAGES.map((name, i) => <li key={name} className={i === stage ? 'is-on' : i < stage ? 'is-done' : ''}><i>{i < stage ? <Icon name="check" /> : i + 1}</i>{name}</li>)}
          </ol>
        </div>
      </Hud>
    </>
  );
}
