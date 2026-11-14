import type { ReactNode } from 'react';
import { Decrypt, PixelImage, Spinner } from '../art';
import { FILM, resolve } from '../kit';
import { a, useAt } from '../clock';
import { BEAT, PL, seeded, SETTLE, settleAt, stepped, STORY } from '../timeline';
import { Hud, World } from './frame';

/* Under the hood: what the back end does with one saved TikTok, laid out left to right. Each station
   is something the code does (docs/portfolio-stash-reel.md maps them). It is drawn in the machine's
   voice: black ground, square windows, pixel type, lime only for what is done. */

const B = BEAT;
/** A machine window at a canvas position. */
function Win({ x, y, w, label, right, at, children, className }: { x: number; y: number; w: number; label: string; right?: ReactNode; at: number; children: ReactNode; className?: string }) {
  return (
    <div className="sx-m-at" style={{ left: x, top: y, width: w }}>
      <div className={`sx-m${className ? ` ${className}` : ''}`} {...a('print', at, 0.26)}>
        <div className="sx-m-bar"><span>{label}</span><span>{right}</span></div>
        <div className="sx-m-body">{children}</div>
      </div>
    </div>
  );
}
const Tick = ({ at, children }: { at: number; children: ReactNode }) => <li {...a('print', at, 0.16)}><i>✓</i>{children}</li>;

const ADMIT = ['signed in', 'subscription not lapsed', 'tiktok.com: a video link', 'row inserted · status: pending'];
const random = seeded(4099);
/** A stand-in for an embedding: 23 cells of differing strength per chunk. The real vectors have 1,536 numbers. */
const CELLS = Array.from({ length: PL.index.vectors.rows }, () => Array.from({ length: PL.index.vectors.cols }, () => 0.12 + random() * 0.88));
const STEPS: [string, number][] = [['save', 0], ['read', B.read], ['write', B.write], ['index', B.index], ['settle', B.settle]];

const line = (d: string, at: number, dur = 0.5, cls = '') => <path key={d} d={d} pathLength={1} className={cls} {...a('draw', at, dur)} />;

export function Pipeline() {
  const step = useAt((t) => stepped(t, STEPS.map(([, at], i) => [at, i] as const)));
  const reviewed = useAt((t) => t >= B.review + 1.1);
  const done = useAt((t) => t >= B.done);
  const { read, evidence, write, index, settle } = PL;
  const chunkY = (i: number) => index.chunks.y + i * index.chunks.dy;
  return (
    <>
      <World>
        <div {...a('out', 20.9, 0.5)}>
          <svg className="sx-m-lines" viewBox="0 0 3500 720">
            {line(`M510 ${PL.y} L${read.x} ${PL.y}`, B.response + 0.3, 0.7, 'is-dash')}
            {line(`M${read.x} ${PL.y} C820 ${PL.y} 820 225 ${read.speech.x} 225`, B.read, 0.5)}
            {line(`M${read.x} ${PL.y} C820 ${PL.y} 820 447 ${read.cover.x} 447`, B.read + 1.7, 0.5)}
            {line(`M${read.speech.x + read.speech.w} 225 C1280 225 1270 300 ${evidence.x} 300`, B.evidence - 0.3, 0.5)}
            {line(`M1250 447 C1300 447 1280 370 ${evidence.x} 370`, B.evidence - 0.1, 0.5)}
            {line(`M${evidence.x + evidence.w} ${PL.y} C1710 ${PL.y} 1710 232 ${write.draft.x} 232`, B.write, 0.5)}
            {line(`M${write.draft.x + 150} 232 L${write.card.x} 232`, B.write + 0.6, 0.35)}
            {line(`M${write.card.x} 420 L${write.review.x + 150} 420`, B.review, 0.35)}
            {line(`M${write.card.x + write.card.w} ${PL.y} L${index.chunks.x} ${PL.y}`, B.index, 0.5)}
            {CELLS.map((_, i) => line(`M${index.chunks.x + index.chunks.w} ${chunkY(i) + 17} L${index.vectors.x} ${chunkY(i) + 17}`, B.embed + i * 0.4, 0.3))}
            {line(`M${index.vectors.x + index.vectors.w} ${PL.y} L${settle.x} ${PL.y}`, B.settle - 0.3, 0.5)}
          </svg>

          {/* Save: answered before any reading starts. */}
          <span className="sx-m-link"><span className="sx-tag sx-m-big" {...a('print', 0.15, 0.24)}><i>link:</i> {STORY.short}</span></span>
          <Win x={PL.save.x} y={PL.save.y} w={PL.save.w} label="capture → add-url" right="at save time" at={B.save}>
            <ul className="sx-m-ticks">{ADMIT.map((text, i) => <Tick key={text} at={B.save + 0.45 + i * 0.45}>{text}</Tick>)}</ul>
          </Win>
          <span className="sx-m-answer"><span className="sx-tag is-spot sx-m-big" {...a('print', B.response, 0.24)}>→ saved. you keep going.</span></span>
          <span className="sx-px sx-m-after" {...a('fade', B.response + 0.5, 0.4)}>after the response</span>

          {/* Read: what was said, and one cover image when that is thin. */}
          <Win x={read.speech.x} y={read.speech.y} w={read.speech.w} label="what was said" right="transcript" at={B.read + 0.3}>
            <div className="sx-m-speech">{[0.92, 0.78, 0.86, 0.6].map((share, i) => <i key={i} {...a('fill', B.read + 0.7 + i * 0.3, 0.5, { width: `${share * 100}%` })} />)}</div>
          </Win>
          <span className="sx-m-rule"><span className="sx-tag is-line" {...a('print', B.read + 1.5, 0.2)}>under 400 characters → read one cover image</span></span>
          <div className="sx-m-cover" {...a('print', B.read + 1.9, 0.26)}>
            <PixelImage src={`${FILM}shot-tiktok.jpg`} w={read.cover.w} h={read.cover.h} focus={[0.5, 0.2]} block={resolve(B.read + 2.0, 0.35)} />
            <span className="sx-tag">the cover</span>
          </div>
          <div className="sx-m-ontext">
            <span className="sx-px" {...a('fade', B.read + 2.6, 0.3)}>the words on it</span>
            <b><Decrypt text={STORY.onScreen} at={B.read + 2.7} d={0.7} /></b>
          </div>

          {/* Evidence: what was read, and what was not. */}
          <Win x={evidence.x} y={evidence.y} w={evidence.w} label="evidence" right="coverage: partial" at={B.evidence} className="is-lit">
            <dl className="sx-m-cover-list">
              <div {...a('print', B.evidence + 0.3, 0.16)}><dt>speech</dt><dd><i>✓</i> recovered</dd></div>
              <div {...a('print', B.evidence + 0.55, 0.16)}><dt>cover image</dt><dd><i>✓</i> 1 read</dd></div>
              <div {...a('print', B.evidence + 0.8, 0.16)}><dt>other visuals</dt><dd className="is-no">not inspected</dd></div>
            </dl>
            <p className="sx-m-quote" {...a('fade', B.evidence + 1.1, 0.4)}>“{STORY.coverage}”</p>
          </Win>

          {/* Write: one model drafts the card, a second reviews it. */}
          <Win x={write.draft.x} y={write.draft.y} w={150} label="draft" at={B.write + 0.3}><b className="sx-m-model">gpt-4.1</b></Win>
          <Win x={write.review.x} y={write.review.y} w={150} label="review" right={reviewed ? <i className="sx-m-ok">✓</i> : <Spinner from={B.review} />} at={B.review + 0.2}><b className="sx-m-model">gpt-5-mini</b></Win>
          <div className="sx-m-card" {...a('print', B.write + 0.8, 0.3)}>
            <span className="sx-tag">{reviewed ? <><i>✓</i> reviewed</> : <><Spinner from={B.write} /> writing the card…</>}</span>
            <h4><Decrypt text={STORY.title} at={B.write + 1.0} d={0.7} /></h4>
            <p {...a('print', B.write + 1.7, 0.26)}>{STORY.desc}</p>
            <div className="sx-px"><span>{STORY.host}</span><span>{STORY.length}</span></div>
          </div>

          {/* Index: patch the row, cut the text into chunks, embed each one. */}
          <Win x={index.patch.x} y={index.patch.y} w={480} label="apply_enrichment_patch" right="compare-and-swap" at={B.index + 0.2}>
            <span className="sx-px">your own note and edits are left untouched</span>
          </Win>
          <span className="sx-px sx-m-cap" {...a('fade', B.index + 0.9, 0.3, { left: index.chunks.x, top: chunkY(0) - 22 })}>chunks · up to 1,200 characters</span>
          <span className="sx-px sx-m-cap" {...a('fade', B.embed, 0.3, { left: index.vectors.x, top: chunkY(0) - 22 })}>text-embedding-3-small</span>
          {CELLS.map((row, i) => (
            <div key={i}>
              <span className="sx-m-chunk" style={{ left: index.chunks.x, top: chunkY(i) }}><span className="sx-px" {...a('print', B.index + 1.0 + i * 0.14, 0.16)}>chunk {i + 1}</span></span>
              <span className="sx-m-vector" style={{ left: index.vectors.x, top: chunkY(i) }}>
                <span {...a('print', B.embed + 0.25 + i * 0.4, 0.2)}>{row.map((v, j) => <i key={j} style={{ opacity: v }} />)}</span>
              </span>
            </div>
          ))}
          <span className="sx-px sx-m-cap" {...a('fade', B.embed + 1.8, 0.3, { left: index.vectors.x, top: chunkY(3) + 46 })}>1,536 numbers each · stored with pgvector</span>

          {/* Settle: complete only if everything passed. */}
          <Win x={settle.x} y={settle.y} w={settle.w} label="settle" right="set_item_enrichment" at={B.settle} className={done ? 'is-lit' : ''}>
            <ul className="sx-m-ticks">{SETTLE.map((name, i) => <Tick key={name} at={settleAt(i)}>{name}</Tick>)}</ul>
          </Win>
          <span className="sx-m-status"><span className="sx-tag is-spot sx-m-huge" {...a('print', B.done, 0.26)}>status: complete</span></span>
          <span className="sx-px sx-m-else" {...a('fade', B.done + 0.4, 0.4)}>anything missing → status: partial</span>
          <ul className="sx-px sx-m-later">
            <li {...a('fade', B.later, 0.3)}><i>→</i> your card updates live</li>
            <li {...a('fade', B.later + 0.35, 0.3)}><i>⟳</i> every 5 min: facts, each quoted from the source</li>
            <li {...a('fade', B.later + 0.7, 0.3)}><i>⟳</i> hourly: assess what fell short, for repair</li>
          </ul>
        </div>
      </World>
      <Hud>
        <div {...a('out', 20.9, 0.5)}>
          <ol className="sx-m-rail" {...a('fade', 0.3, 0.5)}>
            {STEPS.map(([name], i) => <li key={name} className={`sx-px${i === step ? ' is-on' : i < step ? ' is-done' : ''}`}>{name}</li>)}
          </ol>
        </div>
      </Hud>
    </>
  );
}
