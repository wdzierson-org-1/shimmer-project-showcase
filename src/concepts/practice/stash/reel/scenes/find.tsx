import type { ReactNode } from 'react';
import { ArrowUp, Plus } from 'lucide-react';
import { Decrypt, PixelImage, Pointer, Spinner, Symbol, Wordmark } from '../art';
import { FILM, resolve } from '../kit';
import { a, useAt } from '../clock';
import { STORY, typed } from '../timeline';
import { Card } from './card';
import { Hud, World } from './frame';

/* Everything else you save, and finding it again: in the app, and inside an assistant. */

interface Save { id: string; kind: string; done: string; title: string; m1: string; m2: string; picture: (at: number, w: number, h: number) => ReactNode }
const image = (name: string, focus: [number, number]) => (at: number, w: number, h: number) =>
  <PixelImage src={`${FILM}${name}`} w={w} h={h} focus={focus} block={resolve(at, 0.45)} />;
const BARS = [5, 9, 14, 8, 12, 17, 11, 6, 13, 18, 10, 7, 15, 12, 8, 16, 11, 5, 9, 14, 10, 6, 12, 8, 15, 9, 6, 11];
const SAVES: Save[] = [
  { id: 'shot', kind: 'screenshot', done: 'read the text in it', title: 'Chez Colette, West Village', m1: 'photos', m2: 'oct 2', picture: image('shot-colette.jpg', [0.5, 0.36]) },
  {
    id: 'voice', kind: 'voice note', done: 'transcribed', title: 'Book the Lake George cabin before Friday', m1: 'voice note', m2: '0:12',
    picture: () => <div className="sx-voice"><i className="sx-voice-play" /><span>{BARS.map((h, i) => <i key={i} style={{ height: h * 2 }} />)}</span><em className="sx-px">0:12</em></div>,
  },
  { id: 'paper', kind: 'pdf', done: 'read 18 pages', title: 'Lost in the Middle: How Language Models Use Long Contexts', m1: 'arxiv.org', m2: 'pdf', picture: image('paper.png', [0.5, 0.1]) },
  {
    id: 'repo', kind: 'repo', done: 'read the readme', title: 'charmbracelet/gum', m1: 'github.com', m2: 'go',
    picture: () => <div className="sx-plate"><b><i>&gt;</i> charmbracelet/gum</b><span>A tool for glamorous shell scripts.</span></div>,
  },
  { id: 'article', kind: 'article', done: 'read the article', title: 'How to remember more of what you read', m1: 'medium.com', m2: '2 min read', picture: image('cover-article.jpg', [0.5, 0.5]) },
  {
    id: 'book', kind: 'photo', done: 'title and author', title: 'Walden, Henry David Thoreau', m1: 'photo', m2: 'book cover',
    picture: () => <div className="sx-book"><div><span>Henry David Thoreau</span><b>Walden</b><em>or, Life in the Woods</em></div></div>,
  },
];
const PASTA: Save = { id: 'pasta', kind: 'tiktok', done: '', title: STORY.title, m1: STORY.host, m2: STORY.length, picture: image('shot-tiktok.jpg', [0.5, 0.26]) };

const arriveAt = (i: number) => 0.25 + i * 0.42;

function Kind({ save, at }: { save: Save; at: number }) {
  const done = useAt((t) => t >= at + 1.5);
  return done ? <><i>✓</i> {save.done}</> : <><Spinner from={at} /> reading…</>;
}

export function Kinds() {
  const reading = useAt((t) => SAVES.filter((_, i) => t >= arriveAt(i) && t < arriveAt(i) + 1.5).length);
  const count = useAt((t) => SAVES.filter((_, i) => t >= arriveAt(i)).length);
  return (
    <World>
      <div {...a('out', 7.0, 0.5)}>
        <span className="sx-px sx-kinds-count" {...a('fade', 0.3, 0.4)}>{60 + count} saves · {reading ? <><Spinner /> reading {reading}…</> : <><i className="sx-ok-ink">✓</i> all read</>}</span>
        {SAVES.map((save, i) => {
          const at = arriveAt(i);
          return (
            <Card
              key={save.id} className="is-small" x={170 + (i % 3) * 320} y={84 + Math.floor(i / 3) * 262} w={300} media={136}
              ring={at} art={a('print', at, 0.3)}
              picture={save.picture(at + 0.3, 300, 136)} kind={<Kind save={save} at={at} />}
              title={<Decrypt text={save.title} at={at + 0.9} d={0.7} />} m1={save.m1} m2={save.m2}
            />
          );
        })}
      </div>
    </World>
  );
}

/* ------------------------------------------------------------------ 3. find it */

const TYPE = 1.6, SEND = 3.4, FOUND = 4.7, FOCUS = 7.0;
const GRID = [PASTA, SAVES[0], SAVES[1], SAVES[2], SAVES[3], SAVES[4]];
const RANKS: [string, number, string][] = [['by meaning', 0.92, '#1'], ['by words', 0.58, '#1'], ['in your notes', 0, 'none']];

export function Ask() {
  const text = useAt((t) => (t >= SEND ? '' : typed(STORY.ask, t, TYPE, 24)));
  const sent = useAt((t) => t >= SEND);
  const found = useAt((t) => t >= FOUND);
  const answer = useAt((t) => typed(STORY.answer, t, FOUND + 0.15, 72).length);
  const focus = useAt((t) => t >= FOCUS);
  return (
    <>
      <World>
        <div {...a('out', 9.0, 0.5)}>
          <span className="sx-ask-brand" {...a('fade', 0.2, 0.4)}><Wordmark /></span>
          <span className="sx-px sx-ask-count" {...a('fade', 0.3, 0.4)}>66 saves</span>
          {focus && <span className="sx-tag sx-ask-showing" {...a('print', FOCUS, 0.24)}>showing 1 card from this answer</span>}
          <div {...a('fade', 0.3, 0.6)}>
            {GRID.map((save, i) => (
              <Card
                key={save.id} className={`is-small is-mini${focus && i > 0 ? ' is-dim' : ''}`} x={520 + (i % 3) * 235} y={150 + Math.floor(i / 3) * 222} w={215} media={96}
                ring={i === 0 ? FOCUS - 0.3 : undefined}
                picture={save.picture(-9, 215, 96)} kind={save.kind} title={save.title} m1={save.m1} m2={save.m2}
              />
            ))}
          </div>
          <div className="sx-win sx-askwin" {...a('node', 0.45, 0.5, { transformOrigin: 'left bottom' })}>
            <div className="sx-win-bar sx-askwin-bar"><span><Symbol /> ask stash</span><span>–</span></div>
            <div className="sx-askwin-head"><b>Ask Stash</b><span className="sx-px">answers from your 66 saves</span></div>
            <div className="sx-askwin-thread">
              {sent && <p className="sx-ask-me" {...a('rise', SEND, 0.3)}>{STORY.ask}</p>}
              {sent && (
                <p className="sx-px sx-ask-step" {...a('fade', SEND + 0.1, 0.2)}>
                  <Symbol /> {found ? <><i className="sx-ok-ink">✓</i> searched your stash · 1 save</> : <><Spinner from={SEND} /> searching your stash…</>}
                </p>
              )}
              {sent && (
                <div className="sx-ranks" {...a('print', SEND + 0.2, 0.26)}>
                  {RANKS.map(([label, share, rank], i) => (
                    <div key={label} className="sx-px">
                      <span>{label}</span>
                      <i><b {...a('fill', SEND + 0.35 + i * 0.25, 0.5, { width: `${share * 100}%` })} /></i>
                      <em {...a('fade', SEND + 0.85 + i * 0.25, 0.15)}>{rank}</em>
                    </div>
                  ))}
                </div>
              )}
              {found && <p className="sx-ask-answer">{STORY.answer.slice(0, answer)}{answer < STORY.answer.length && <i className="sx-caret" />}</p>}
            </div>
            <div className="sx-askwin-input">
              <span data-spot="ask">{text || (sent ? <em>Ask your stash…</em> : <em>Ask your stash…</em>)}{!sent && text && <i className="sx-caret" />}</span>
              <i data-spot="send"><ArrowUp size={18} /></i>
            </div>
          </div>
          <Pointer path={[[0.9, [560, 640]], [TYPE - 0.25, 'ask'], [TYPE + 0.5, [300, 640]], [SEND - 0.12, 'send'], [SEND + 1.0, [470, 640]]]} presses={[TYPE - 0.2, SEND]} />
        </div>
      </World>
      <Hud><div {...a('out', 2.6, 0.4)}><span className="sx-tag is-spot sx-later" {...a('print', 0.15, 0.24)}>three weeks later</span></div></Hud>
    </>
  );
}

/* ------------------------------------------------------------------ 4. in your AI */

const PROMPT = 1.2, ASKED = 3.6, TOOL = 3.85, READ = 4.9, LIST = 5.9;
const WORKS = ['Claude', 'ChatGPT', 'Cursor', 'VS Code', 'Zed', 'Raycast', 'Codex', 'Gemini CLI'];

export function Assistant() {
  const text = useAt((t) => (t >= ASKED ? '' : typed(STORY.prompt, t, PROMPT, 26)));
  const asked = useAt((t) => t >= ASKED);
  const tool = useAt((t) => (t < TOOL ? 0 : t < READ ? 1 : 2));
  const lead = 'From the TikTok you saved, Tomato & mozzarella penne:';
  const said = useAt((t) => typed(lead, t, READ + 0.15, 80).length);
  return (
    <World>
      <div {...a('out', 9.5, 0.5)}>
        <div className="sx-crop sx-ai-stage" {...a('fade', 0.2, 0.5)}><i /><span className="sx-tag sx-ai-url">gostash.it/mcp</span></div>
        <div className="sx-claude" {...a('window', 0.35, 0.8)}>
          <div className="sx-claude-bar"><span><i /><i /><i /></span><b>Claude</b><em className="sx-px"><i />stash connected</em></div>
          <div className="sx-claude-thread">
            {asked && <p className="sx-claude-me" {...a('rise', ASKED, 0.3)}>{STORY.prompt}</p>}
            {tool > 0 && (
              <p className="sx-claude-tool" {...a('fade', TOOL, 0.2)}>
                <span className="sx-px">{tool === 1 ? <Spinner from={TOOL} /> : '✓'}</span>
                {tool === 1 ? 'Searching Stash' : 'Searched Stash'}
                <code>search_stash("{STORY.query}")</code>
              </p>
            )}
            {tool === 2 && <p className="sx-claude-say">{lead.slice(0, said)}</p>}
            {tool === 2 && (
              <ul className="sx-claude-list">
                {STORY.ingredients.map((item, i) => <li key={item} {...a('rise', LIST + i * 0.26, 0.3)}><i />{item}</li>)}
              </ul>
            )}
            {tool === 2 && <p className="sx-px sx-claude-src" {...a('fade', LIST + 1.5, 0.4)}>from your stash · {STORY.short}</p>}
          </div>
          <div className="sx-claude-input">
            <span data-spot="reply">{text || <em>Reply to Claude…</em>}{!asked && text && <i className="sx-caret" />}</span>
            <div><Plus size={15} /><small>Stash connected</small><i data-spot="go"><ArrowUp size={15} /></i></div>
          </div>
        </div>
        <ul className="sx-works">
          <li className="sx-px" {...a('fade', 7.5, 0.3)}>works with</li>
          {WORKS.map((name, i) => <li key={name} className="sx-px is-cell" {...a('print', 7.6 + i * 0.09, 0.2)}>{name}</li>)}
          <li className="sx-px" {...a('fade', 8.5, 0.3)}>…and anything else that supports MCP</li>
        </ul>
        <Pointer path={[[0.8, [1000, 600]], [PROMPT - 0.2, 'reply'], [PROMPT + 0.5, [820, 590]], [ASKED - 0.12, 'go'], [ASKED + 0.9, [1090, 560]]]} presses={[PROMPT - 0.15, ASKED]} />
      </div>
    </World>
  );
}
