import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpRight, BookOpen, Check, Copy, MessageSquareText, Plus, Square } from 'lucide-react';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/config';
import type { PortfolioProject } from './projects';
import { portfolioInstructions, retrieveProjects, retrieveWriting } from './chatContext';
import { articleSources, citedSources, projectSource, type ChatSource, type PortfolioArticle } from './chat/sources';
import { readAnswerStream } from './chat/stream';
import AnimatedAnswer from './chat/AnimatedAnswer';
import './portfolio-chat.css';

type Turn = { id: string; role: 'user' | 'assistant'; content: string; sources?: ChatSource[]; citations?: ChatSource[]; status?: 'receiving' | 'complete' | 'stopped' | 'error' };
type Props = { projects: PortfolioProject[]; articles: PortfolioArticle[]; writingLoading: boolean; initialProject?: PortfolioProject };

export default function PortfolioChat({ projects, articles, writingLoading, initialProject }: Props) {
  const [turns, setTurns] = useState<Turn[]>([]), [draft, setDraft] = useState(''), [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<'error' | 'stopped' | null>(null);
  const [activeAnswer, setActiveAnswer] = useState<string | null>(null), [copied, setCopied] = useState<string | null>(null), [copyError, setCopyError] = useState(false);
  const [newReply, setNewReply] = useState(false);
  const controller = useRef<AbortController | null>(null), transcript = useRef<HTMLDivElement>(null), input = useRef<HTMLTextAreaElement>(null);
  const nearBottom = useRef(true), copyTimer = useRef<ReturnType<typeof setTimeout>>();
  const writing = useMemo(() => articleSources(articles), [articles]);
  const selected = turns.find(turn => turn.id === activeAnswer);
  const sources = selected?.citations || [];
  const canAsk = projects.length > 0 && !writingLoading;
  const suggestions = initialProject ? [
    { label: 'Contribution', question: `What was Will’s role in ${initialProject.title}?` },
    { label: 'Decisions', question: 'What problem did this project address, and how did Will approach it?' },
  ] : [
    { label: 'Design & engineering', question: 'Where has Will designed and built the product?' },
    { label: 'Healthcare', question: 'How has Will brought voice and AI into healthcare?' },
    { label: 'Research', question: 'What did Will learn from his work at Google Beijing?' },
    { label: 'Writing', question: 'What does Will write about AI agent accountability?' },
  ];

  useEffect(() => () => { const request = controller.current; controller.current = null; request?.abort(); clearTimeout(copyTimer.current); }, []);
  useLayoutEffect(() => {
    if (!input.current) return;
    input.current.style.height = 'auto'; input.current.style.height = `${Math.min(144, input.current.scrollHeight)}px`;
  }, [draft]);
  useLayoutEffect(() => {
    const log = transcript.current;
    if (!log) return;
    if (nearBottom.current) { log.scrollTop = log.scrollHeight; setNewReply(false); }
    else if (turns.at(-1)?.role === 'assistant' && turns.at(-1)?.content) setNewReply(true);
  }, [turns, busy, notice]);

  async function ask(question: string, retry = false) {
    if (!question.trim() || controller.current || !canAsk) return;
    const lastUser = turns.map(t => t.role).lastIndexOf('user');
    const next: Turn[] = retry ? turns.slice(0, lastUser + 1) : [...turns, { id: crypto.randomUUID(), role: 'user', content: question.trim() }];
    const abort = new AbortController(); controller.current = abort;
    const questions = next.filter(t => t.role === 'user').map(t => t.content);
    const ranked = [...retrieveProjects(projects, questions, initialProject).map(projectSource), ...retrieveWriting(writing, questions.slice(-2).join(' '))];
    const answerId = crypto.randomUUID();
    const answer: Turn = { id: answerId, role: 'assistant', content: '', status: 'receiving', sources: ranked, citations: [] };
    nearBottom.current = true; setTurns([...next, answer]); setActiveAnswer(answerId); setDraft(''); setBusy(true); setNotice(null); setNewReply(false);
    input.current?.focus({ preventScroll: true });
    let latest = '', updateTimer: ReturnType<typeof setTimeout> | undefined;
    const flush = (status: Turn['status'] = 'receiving') => {
      clearTimeout(updateTimer); updateTimer = undefined;
      if (controller.current !== abort) return;
      setTurns(current => current.map(t => t.id === answerId ? { ...t, content: latest, citations: citedSources(latest, ranked), status } : t));
    };
    const timeout = setTimeout(() => abort.abort('timeout'), 60000);
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/chat`, {
        method: 'POST', signal: abort.signal,
        headers: { 'Content-Type': 'application/json', apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ model: 'gpt-4o-mini', stream: true, messages: [
          { role: 'system', content: portfolioInstructions(projects, ranked) },
          ...next.filter(t => t.role === 'user' || t.status === 'complete').slice(-10).map(({ role, content }) => ({ role, content })),
        ] }),
      });
      await readAnswerStream(response, abort.signal, text => {
        latest = text;
        if (!updateTimer) updateTimer = setTimeout(() => flush(), 32);
      });
      if (controller.current !== abort || abort.signal.aborted) return;
      flush('complete');
    } catch {
      if (controller.current === abort) {
        const status = abort.signal.reason === 'stopped' ? 'stopped' : 'error';
        flush(status); setNotice(status);
      }
    } finally {
      clearTimeout(timeout); clearTimeout(updateTimer);
      if (controller.current === abort) { controller.current = null; setBusy(false); }
    }
  }
  function reset() {
    const request = controller.current; controller.current = null; request?.abort();
    setTurns([]); setBusy(false); setNotice(null); setActiveAnswer(null); setNewReply(false); nearBottom.current = true;
    setCopied(null); setCopyError(false); clearTimeout(copyTimer.current);
    setDraft(''); input.current?.focus({ preventScroll: true });
  }
  async function copy(turn: Turn) {
    try { await navigator.clipboard.writeText(turn.content); setCopied(turn.id); setCopyError(false); clearTimeout(copyTimer.current); copyTimer.current = setTimeout(() => setCopied(null), 2000); }
    catch { setCopyError(true); }
  }
  function showSources(id: string) {
    setActiveAnswer(id);
    if (innerWidth < 901) requestAnimationFrame(() => document.getElementById('conversation-sources')?.scrollIntoView({ block: 'start', behavior: 'instant' }));
  }
  const lastQuestion = [...turns].reverse().find(t => t.role === 'user')?.content || '';

  return <section className="portfolio-conversation">
    <div className="conversation-intro"><span className="eyebrow">An open book / Portfolio AI</span><h1>Get closer to the work.</h1><p>Explore the projects, the decisions, and Will’s contribution. Follow a question wherever it leads.</p></div>
    <div className="conversation-workspace">
      <div className="conversation-main">
        <div className="conversation-toolbar"><div><MessageSquareText size={16} strokeWidth={1.5}/><span>{initialProject ? initialProject.title : 'A conversation about the work'}</span></div><button onClick={reset} disabled={!turns.length && !draft} aria-label="New conversation"><Plus size={15}/><span>New conversation</span></button></div>
        <div className="conversation-scroll" ref={transcript} data-lenis-prevent onScroll={() => {
          const log = transcript.current; if (!log) return; nearBottom.current = log.scrollHeight - log.scrollTop - log.clientHeight < 80;
          if (nearBottom.current) setNewReply(false);
        }}>
          {!turns.length && <div className="conversation-welcome"><span className="conversation-kicker">Curiosity is a good starting point.</span><h2>{initialProject ? 'Go a little deeper.' : 'What would you like to know?'}</h2><p>{initialProject ? `Ask about ${initialProject.title}, from the problem to Will’s role in the work.` : 'From early mobile experiences to healthcare, AI, and building a company. Start anywhere.'}</p><div className="conversation-prompts">{suggestions.map(({ label, question }) => <button key={label} onClick={() => ask(question)} disabled={!canAsk}><span>{label}</span><strong>{question}</strong><ArrowUpRight size={15}/></button>)}</div></div>}
          <div className="conversation-turns" role="log" aria-label="Portfolio conversation" aria-live="polite" aria-relevant="additions text" aria-busy={busy}>
            {turns.map((turn, i) => <article key={turn.id} className={`conversation-turn conversation-${turn.role}`} data-status={turn.status}>
              <span className="conversation-speaker">{turn.role === 'assistant' ? <><span className="conversation-mark" aria-hidden="true">w.</span>Portfolio AI{turn.status === 'receiving' && <span className="conversation-writing">{turn.content ? 'Writing' : 'Reading the work'}<span aria-hidden="true"/></span>}</> : 'You'}</span>
              <div className="conversation-message">{turn.role === 'assistant' ? <AnimatedAnswer content={turn.content} streaming={turn.status === 'receiving'} sources={turn.sources || []}/> : <p>{turn.content}</p>}</div>
              {turn.role === 'assistant' && !!turn.content && <div className="conversation-answer-tools">
                {!!turn.citations?.length && <button className={activeAnswer === turn.id ? 'is-active' : ''} onClick={() => showSources(turn.id)} aria-label={`View sources for answer ${Math.floor(i / 2) + 1}`} aria-pressed={activeAnswer === turn.id}><BookOpen size={13}/>{turn.citations.length} cited {turn.citations.length === 1 ? 'source' : 'sources'}</button>}
                {turn.status !== 'receiving' && <button onClick={() => copy(turn)} aria-label={copied === turn.id ? 'Answer copied' : 'Copy answer'}>{copied === turn.id ? <Check size={13}/> : <Copy size={13}/>}</button>}
                {(turn.status === 'stopped' || turn.status === 'error') && <span className="conversation-partial">Partial answer</span>}
              </div>}
            </article>)}
          </div>
          {notice && <div className="conversation-notice" role={notice === 'error' ? 'alert' : 'status'}><p>{notice === 'error' ? 'The answer couldn’t be completed. Your question and any text received are still here.' : 'Answer stopped. Any text received is still here.'}</p><button onClick={() => ask(lastQuestion, true)}>Try again <ArrowUpRight size={12}/></button></div>}
          {copyError && <p className="conversation-copy-error" role="status">Copy wasn’t available. You can select the answer to copy it.</p>}
        </div>
        <div className="conversation-compose-area">
          {newReply && <button className="conversation-new-reply" onClick={() => { if (transcript.current) transcript.current.scrollTop = transcript.current.scrollHeight; nearBottom.current = true; setNewReply(false); }}>Latest answer <ArrowDown size={12}/></button>}
          <form className="conversation-composer" onSubmit={e => { e.preventDefault(); void ask(draft); }}>
            <label htmlFor="portfolio-question" className="conversation-sr">{turns.length ? 'Ask a follow-up about Will’s work' : 'Ask about Will’s work'}</label>
            <textarea ref={input} id="portfolio-question" value={draft} onChange={e => setDraft(e.target.value)} placeholder={turns.length ? 'Ask a follow-up…' : 'Ask a question about the work…'} maxLength={1500} rows={2} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void ask(draft); } }}/>
            <div className="conversation-compose-footer"><span><BookOpen size={12}/>{canAsk ? 'Projects & writing' : 'Loading the portfolio…'}</span>{busy ? <button type="button" className="conversation-send" aria-label="Stop answer" onClick={() => controller.current?.abort('stopped')}><Square size={12} fill="currentColor"/></button> : <button className="conversation-send" aria-label="Send question" disabled={!draft.trim() || !canAsk}><ArrowUp size={17}/></button>}</div>
          </form>
          <p className="conversation-disclosure">AI-generated answers. Questions are sent to the AI service.</p>
        </div>
      </div>
      <aside className="conversation-sources" id="conversation-sources" aria-label="Sources cited in the selected answer">
        <div className="conversation-source-title"><BookOpen size={15}/><h2>Cited sources</h2>{!!sources.length && <span>{String(sources.length).padStart(2, '0')}</span>}</div>
        {!!sources.length && <p className="conversation-source-context">From {selected?.status === 'receiving' ? 'the answer being written' : 'this answer'}</p>}
        <div className="conversation-source-list" data-lenis-prevent>{sources.map((source, index) => <a key={`${activeAnswer}:${source.id}`} href={source.url} target="_blank" rel="noopener noreferrer">
          <div className="conversation-source-image">{source.image ? <img src={source.image} alt="" loading="lazy"/> : source.kind === 'article' ? <BookOpen size={20} strokeWidth={1.25}/> : <span>{String(index + 1).padStart(2, '0')}</span>}</div><div><span>{source.label}</span><h3>{source.title}</h3><small>Open {source.kind === 'project' ? 'project' : 'article'} <ArrowUpRight size={11}/></small></div>
        </a>)}</div>
        {!sources.length && <p className="conversation-sources-empty">{!selected ? 'Projects and writing cited in an answer will appear here.' : selected.status === 'receiving' ? 'Sources appear as the answer cites them.' : 'No sources were cited in this answer.'}</p>}
        {!!sources.length && <p className="conversation-source-note">Sources open in a new tab, so you can keep your place in the conversation.</p>}
      </aside>
    </div>
  </section>;
}
