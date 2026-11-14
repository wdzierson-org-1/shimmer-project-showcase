import { useCallback, useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import './gisted-video.css';

const scenes = [
  { id: 'title', seconds: 6, label: 'Intro', caption: 'Gisted — don\'t just send a link. Send the gist.' },
  { id: 'paste', seconds: 8, label: 'Paste', caption: 'Every link you\'ve ever shared just sat there. Gisted turns a URL into a page people actually open — and answer.' },
  { id: 'enrich', seconds: 12, label: 'Enrich', caption: 'AI doesn\'t just summarize. It maps the whole idea: key moments, mentions, diagrams. Then suggests what to add next.' },
  { id: 'customize', seconds: 8, label: 'Customize', caption: 'Your perspective comes first. Not a robot summary — your words, your reason for sharing. That\'s what makes people read.' },
  { id: 'kinds', seconds: 7, label: 'Content types', caption: 'Videos, books, slides, recipes, products, TikToks. One tool for everything worth sharing — each content type treated differently.' },
  { id: 'send', seconds: 8, label: 'Share', caption: 'AI writes the social post. One click to LinkedIn, X, or email. Track who opened, who read, who responded.' },
  { id: 'reader', seconds: 8, label: 'Feedback', caption: 'Sharing becomes a conversation. Ratings, questions, replies — built in. Every reader sees a \"Make a gist\" CTA. That\'s the viral loop.' },
  { id: 'dashboard', seconds: 6, label: 'Library', caption: 'Every gist you\'ve shared. Comments, ratings, engagement — the content library that grows with every share.' },
  { id: 'system', seconds: 6, label: 'System', caption: 'One person, full stack. React, Supabase, 40+ edge functions, Stripe, Chrome extension, video generation.' },
];

const DURATIONS = scenes.map(s => s.seconds);
const TOTAL = DURATIONS.reduce((a, b) => a + b, 0);
const STARTS = DURATIONS.reduce<number[]>((acc, d, i) => { acc.push(i === 0 ? 0 : acc[i - 1] + DURATIONS[i - 1]); return acc; }, []);
function sceneAt(t: number) { for (let i = scenes.length - 1; i >= 0; i--) if (t >= STARTS[i]) return i; return 0; }
function fmt(t: number) { return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`; }

const TYPED_URL = 'https://youtube.com/watch?v=HQQtaWgIQmE';
const TYPED_TAKE = 'Fourteen minutes that broke my brain a little.';

const enrichL = [
  { label: 'What it is', icon: '◉', body: 'An explainer on quantum immortality from Strange Loops' },
  { label: 'Key moments', icon: '⏱', body: '1:10 Many worlds in two minutes\n4:40 The quantum suicide experiment\n10:05 Why it doesn\'t cover ordinary death', extra: '3 more' },
  { label: 'Diagram on screen', icon: '◈', body: 'A tree that splits at every round: one branch goes on, one ends' },
  { label: 'The catch', icon: '◇', body: 'Real death is gradual, everyone else sees the gun fire, and nobody else can ever be convinced' },
  { label: 'A short glossary', icon: '≡', body: 'Many-worlds, superposition, decoherence and the Born rule, in plain words.', tag: 'Can add' },
];
const enrichR = [
  { label: 'Summary', icon: '✦', body: 'If many-worlds is true, a quantum-triggered gun can never kill you from your own point of view. Clever, untestable, and probably not about real death.' },
  { label: 'Transcript', icon: '¶', body: 'About 2,200 words, timestamped' },
  { label: 'Mentions', icon: '⁂', body: '', mentions: ['Hugh Everett', 'Hans Moravec', 'Bruno Marchal', 'Max Tegmark', 'Schrödinger\'s cat'] },
  { label: 'The experiment as a diagram', icon: '⌗', body: 'A branching tree you can take in at a glance, because the idea is easier to see than to read.', tag: 'Can add' },
  { label: 'Further reading', icon: '⤳', body: 'Tegmark\'s paper, the Stanford Encyclopedia entry and an overview of the debate.', tag: 'Can add' },
];

const suggestIcons = ['⌗', '≡', '⤳', '◻'];

const kindCards = [
  { thumb: '🎬', bg: '#000', color: '#fff', title: 'A video on a hard idea', sub: 'A summary, the key moments and the transcript. Then a diagram that makes the idea click, and a glossary.', label: 'Quantum immortality' },
  { thumb: '📕', bg: '#f5f0e8', color: '#000', title: 'A book you keep recommending', sub: 'The big ideas on one page. Then a cheat sheet, questions for a book club, and a date picker to meet.', label: 'Contagious' },
  { thumb: '📊', bg: '#f0f0f0', color: '#000', title: 'Slides that need a second look', sub: 'An outline and the decisions it asks for. Then a rating, so reviewers can say whether it\'s ready.', label: 'Onboarding redesign' },
  { thumb: '🏠', bg: '#c4a882', color: '#fff', title: 'A place you want to go', sub: 'Where it is and what\'s nearby. Then a calendar where friends mark the days they\'re free.', label: 'Lisbon rooftop stay' },
  { thumb: '🍝', bg: '#e8d0c0', color: '#000', title: 'A recipe for Thursday', sub: 'Ingredients and steps. Then a grocery list you can send to Instacart, scaled for your crowd.', label: '20-minute penne' },
  { thumb: '👜', bg: '#b8a090', color: '#fff', title: 'Something you might buy', sub: 'The details that matter. Then a poll on the color, and how it measures up.', label: 'The Woven Tote' },
];

const dashCards = [
  { type: 'Photo', icon: '🖼', title: 'A courtyard of ferns and blue tiles', status: 'Draft', date: 'Sep 13', bg: '#4a7a5a' },
  { type: 'Article', icon: '📄', title: 'How to remember more of what you read', status: 'Shared', date: 'Sep 7', bg: '#8a7a60', comments: 1, likes: 1 },
  { type: 'Product', icon: '🛍', title: 'The Woven Tote, Tan', status: 'Shared', date: 'Aug 30', bg: '#a08870', comments: 1, likes: 1 },
  { type: 'New product', icon: '✦', title: 'Solwen Rise, a sunrise alarm lamp', status: 'Draft', date: 'Aug 23', bg: '#d0c8b8' },
  { type: 'YouTube', icon: '▷', title: 'Jev, explained: the AI model that only makes decisions', status: 'Shared', date: 'Aug 8', bg: '#1a1a2a', comments: 1, likes: 1 },
];

const systemNodes = [
  { label: 'React + TypeScript', x: 50, y: 15 },
  { label: 'Supabase', x: 50, y: 45 },
  { label: '40+ Edge Functions', x: 20, y: 45 },
  { label: 'Stripe', x: 80, y: 45 },
  { label: 'Chrome Extension', x: 20, y: 75 },
  { label: 'Vercel', x: 50, y: 75 },
  { label: 'Video Generation', x: 80, y: 75 },
];

export default function GistedVideo() {
  const stage = useRef<HTMLDivElement>(null);
  const elapsed = useRef(0);
  const timerLabel = useRef<HTMLOutputElement>(null);
  const progress = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [scene, setScene] = useState(0);
  const [ended, setEnded] = useState(false);
  const [muted, setMuted] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [norm, setNorm] = useState(0);
  const sceneRef = useRef(0);

  const paint = useCallback((time: number) => {
    elapsed.current = Math.max(0, Math.min(TOTAL, time));
    const next = sceneAt(elapsed.current);
    if (sceneRef.current !== next) { sceneRef.current = next; setScene(next); }
    setNorm((elapsed.current - STARTS[next]) / scenes[next].seconds);
    if (progress.current) {
      progress.current.value = String(elapsed.current);
      progress.current.style.setProperty('--played', `${elapsed.current / TOTAL * 100}%`);
    }
    const label = `${fmt(elapsed.current)} / ${fmt(TOTAL)}`;
    if (timerLabel.current && timerLabel.current.value !== label) timerLabel.current.value = label;
  }, []);

  useEffect(() => { const a = audioRef.current; if (!a) return; const ok = () => setHasAudio(true); const fail = () => setHasAudio(false); a.addEventListener('canplaythrough', ok); a.addEventListener('error', fail); a.src = '/portfolio/gisted/narration.m4a'; a.load(); return () => { a.removeEventListener('canplaythrough', ok); a.removeEventListener('error', fail); }; }, []);
  useEffect(() => { const p = matchMedia('(prefers-reduced-motion: reduce)'); const fn = () => { setReduced(p.matches); if (p.matches) setPlaying(false); }; p.addEventListener('change', fn); return () => p.removeEventListener('change', fn); }, []);
  useEffect(() => { if (!started) return; const h = () => { if (document.hidden) setPlaying(false); }; document.addEventListener('visibilitychange', h); const obs = new IntersectionObserver(([e]) => { if (!e.isIntersecting) setPlaying(false); }, { threshold: 0 }); if (stage.current) obs.observe(stage.current); return () => { obs.disconnect(); document.removeEventListener('visibilitychange', h); }; }, [started]);
  useEffect(() => { if (!playing || reduced) return; let f = 0, prev = performance.now(); const tick = (now: number) => { const dt = Math.min((now - prev) / 1000, .15); prev = now; elapsed.current = Math.min(TOTAL, elapsed.current + dt); paint(elapsed.current); if (elapsed.current >= TOTAL) { setPlaying(false); setEnded(true); return; } f = requestAnimationFrame(tick); }; f = requestAnimationFrame(tick); return () => cancelAnimationFrame(f); }, [playing, reduced, paint]);
  useEffect(() => { const a = audioRef.current; if (!a || !hasAudio) return; if (playing && !muted) { a.currentTime = elapsed.current; void a.play().catch(() => {}); } else a.pause(); }, [playing, muted, hasAudio]);

  function seek(t: number) { setEnded(t >= TOTAL); if (t >= TOTAL) setPlaying(false); paint(t); if (audioRef.current && hasAudio) audioRef.current.currentTime = t; }
  function begin() { setStarted(true); setPlaying(!reduced); setEnded(false); paint(0); stage.current?.focus({ preventScroll: true }); }
  function toggle() { if (reduced) { seek(STARTS[(scene + 1) % scenes.length]); return; } if (ended) { seek(0); setPlaying(true); } else setPlaying(v => !v); }

  const cur = scenes[scene];
  const n = norm;

  return <section className="gv" aria-label="Gisted: product sizzle reel">
    <audio ref={audioRef} preload="none"/>
    <div ref={stage} className={`gv-stage ${started ? 'is-started' : ''}`} tabIndex={started ? 0 : -1}
      onKeyDown={e => { if ((e.target as HTMLElement).closest('button,input')) return; if (started && e.code === 'Space') { e.preventDefault(); toggle(); } if (started && ['ArrowLeft', 'ArrowRight'].includes(e.key)) { e.preventDefault(); seek(elapsed.current + (e.key === 'ArrowRight' ? 3 : -3)); } }}>

      {/* ═══ TITLE ═══ */}
      {(!started || cur.id === 'title') && <div className="gv-overlay gv-title-scene">
        <div className="gv-logo-mark">✦</div>
        <h3>Gisted</h3>
        <p className="gv-tagline">Don't just send a link.<br/>Send the gist.</p>
        <small>AI-powered sharing · Vibrant Labworks (Founder) · 2026</small>
        {started && <div className="gv-title-flow">
          {['Paste anything', '→', 'AI enrichment', '→', 'Your perspective', '→', 'Send & track'].map((t, i) =>
            <span key={i} className={i % 2 === 1 ? 'gv-arrow' : ''} style={{ opacity: n > 0.2 + i * 0.08 ? 1 : 0 }}>{t}</span>
          )}
        </div>}
      </div>}

      {/* ═══ PASTE ═══ */}
      {started && cur.id === 'paste' && <div className="gv-overlay gv-app-scene">
        <div className="gv-app">
          <div className="gv-app-header"><span className="gv-glogo">gisted<sup>✦</sup></span><span className="gv-app-nav">How it works<span>Chrome extension</span><span>Sign in</span><b>Get started</b></span></div>
          <div className="gv-app-body gv-paste-body">
            <h2 className="gv-app-headline" style={{ opacity: n > 0.05 ? 1 : 0 }}>Don't just send a link.<br/>Send the gist.</h2>
            <p className="gv-app-sub" style={{ opacity: n > 0.12 ? 1 : 0 }}>Paste a video, article, recipe or doc. Gisted pulls out what matters,<br/>helps you add your take, and turns it into a page people actually open, and answer.</p>
            <div className="gv-paste-input" style={{ opacity: n > 0.18 ? 1 : 0 }}>
              <span className="gv-paste-placeholder">{n < 0.25 ? 'Paste a link, start a note, or drop a file' : ''}</span>
              {n >= 0.25 && <span className="gv-typed-url">{TYPED_URL.slice(0, Math.min(TYPED_URL.length, Math.floor((n - 0.25) / 0.35 * TYPED_URL.length)))}<span className="gv-caret"/></span>}
              <div className="gv-paste-row"><span className="gv-paste-attach">📎 Upload a file</span><button className={`gv-paste-btn ${n > 0.62 ? 'is-ready' : ''}`}>Get the gist</button></div>
            </div>
            {n > 0.65 && <div className="gv-paste-preview gv-anim-up">
              <div className="gv-paste-thumb">▶</div>
              <div><small>YouTube · 14:30</small><strong>Quantum immortality, explained</strong><span>Strange Loops</span></div>
            </div>}
            <div className="gv-examples" style={{ opacity: n > 0.15 ? 1 : 0 }}>
              <span>Or pick an example</span>
              <div className="gv-example-row">
                {[{e:'🎬',t:'YouTube',s:'Quantum immortality'},{e:'📕',t:'Book',s:'Contagious'},{e:'📊',t:'Slides',s:'Onboarding redesign'},{e:'📄',t:'PDF',s:'Lost in the Middle'},{e:'💊',t:'Health',s:'Seven hours'},{e:'🏠',t:'TikTok',s:'Lisbon rooftop'}].map(c => <span key={c.t} className="gv-example-chip"><b>{c.e}</b><span><strong>{c.t}</strong> {c.s}</span></span>)}
              </div>
            </div>
          </div>
        </div>
      </div>}

      {/* ═══ ENRICH ═══ */}
      {started && cur.id === 'enrich' && <div className="gv-overlay gv-app-scene">
        <div className="gv-app gv-app-wide">
          <div className="gv-app-header">
            <span className="gv-glogo">gisted<sup>✦</sup></span>
            <span className="gv-step-bar"><b className="gv-step-num active">1</b> Get the gist <span className="gv-step-line">——→</span> <b className="gv-step-num">2</b> Customize <span className="gv-step-line">——→</span> <b className="gv-step-num">3</b> Send</span>
            <span className="gv-app-nav"><span>Back</span><b>Customize</b></span>
          </div>
          <div className="gv-app-body gv-enrich-body">
            {n < 0.88 && <div className="gv-enrich-status"><span className="gv-status-pill"><svg className="gv-ai-dot" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeDasharray="50 20" strokeLinecap="round"/></svg> Enriching…</span></div>}
            {n >= 0.88 && <div className="gv-enrich-status done"><span className="gv-status-pill">✓ Ready to customize</span></div>}

            <div className="gv-enrich-map">
              <div className="gv-enrich-col gv-enrich-left">
                {enrichL.map((card, i) => {
                  const show = n > 0.06 + i * 0.11;
                  return <div key={card.label} className={`gv-ecard ${show ? 'is-visible' : ''}`}>
                    <div className="gv-ecard-head"><span className="gv-ecard-icon">{card.icon}</span><strong>{card.label}</strong>{card.tag && <span className="gv-ecard-tag">{card.tag}</span>}</div>
                    <p>{card.body.split('\n').map((line, j) => <span key={j}>{line}<br/></span>)}</p>
                    {card.extra && <small className="gv-ecard-more">{card.extra}</small>}
                  </div>;
                })}
              </div>

              <div className="gv-enrich-center">
                <svg className="gv-enrich-lines" viewBox="0 0 200 600" preserveAspectRatio="none">
                  {enrichL.map((_, i) => {
                    const y = 60 + i * 120;
                    return <path key={`l${i}`} d={`M 0 ${y} C 50 ${y}, 70 300, 100 300`} className={`gv-eline ${n > 0.08 + i * 0.11 ? 'is-drawn' : ''}`}/>;
                  })}
                  {enrichR.map((_, i) => {
                    const y = 60 + i * 120;
                    return <path key={`r${i}`} d={`M 200 ${y} C 150 ${y}, 130 300, 100 300`} className={`gv-eline ${n > 0.1 + i * 0.11 ? 'is-drawn' : ''}`}/>;
                  })}
                </svg>
                <div className={`gv-enrich-video ${n > 0.02 ? 'is-visible' : ''}`}>
                  <div className="gv-item-card">
                    <div className="gv-item-media">
                      <div className="gv-video-overlay">
                        <div className="gv-video-overlay-title">Alive?</div>
                        <div className="gv-video-overlay-sub">quantum immortality, explained</div>
                        <div className="gv-video-overlay-tags">{'{alive}'} + {'{dead}'}</div>
                        <span className="gv-video-overlay-dur">14:30</span>
                      </div>
                    </div>
                    <div className="gv-item-body">
                      <span className="gv-item-site">▷ YouTube</span>
                      <div className="gv-item-title">Quantum immortality, explained</div>
                      <span className="gv-item-channel">Strange Loops · 14:30</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="gv-enrich-col gv-enrich-right">
                {enrichR.map((card, i) => {
                  const show = n > 0.1 + i * 0.11;
                  return <div key={card.label} className={`gv-ecard ${show ? 'is-visible' : ''}`}>
                    <div className="gv-ecard-head"><span className="gv-ecard-icon">{card.icon}</span><strong>{card.label}</strong>{card.tag && <span className="gv-ecard-tag">{card.tag}</span>}</div>
                    {card.mentions ? <div className="gv-ecard-mentions">{card.mentions.map(m => <span key={m}>{m}</span>)}</div> : <p>{card.body}</p>}
                  </div>;
                })}
              </div>
            </div>

            {n > 0.82 && <p className="gv-enrich-summary gv-anim-up">Found 7 things in the video, and 3 more that could make your page more useful.</p>}
          </div>
        </div>
      </div>}

      {/* ═══ CUSTOMIZE ═══ */}
      {started && cur.id === 'customize' && <div className="gv-overlay gv-app-scene">
        <div className="gv-app gv-app-wide">
          <div className="gv-app-header">
            <span className="gv-glogo">gisted<sup>✦</sup></span>
            <span className="gv-step-bar"><b className="gv-step-num done">✓</b> Get the gist <span className="gv-step-line">——→</span> <b className="gv-step-num active">2</b> Customize <span className="gv-step-line">——→</span> <b className="gv-step-num">3</b> Send</span>
            <span className="gv-app-nav"><span>Back</span><b>Continue</b></span>
          </div>
          <div className="gv-app-body gv-cz-body">
            <div className="gv-cz-main">
              <div className="gv-cz-tabs"><span className="gv-cz-tab active">≡ Page</span><span className="gv-cz-tab">▢ Video <sup>Pro</sup></span><span className="gv-cz-preview">👁 Preview as a reader</span></div>
              <h2 className="gv-cz-title" style={{ opacity: n > 0.05 ? 1 : 0 }}>Quantum immortality, explained</h2>
              <p className="gv-cz-desc" style={{ opacity: n > 0.1 ? 1 : 0 }}>The strangest idea to come out of many-worlds: if every quantum outcome happens, you only ever experience the branches where you survive. Why it's so hard to argue with, and why even Max Tegmark says it doesn't apply to ordinary death.</p>
              <div className={`gv-cz-take ${n > 0.2 ? 'is-visible' : ''}`}>
                <div className="gv-cz-take-deco">❝</div>
                <div className="gv-cz-take-box">
                  <div className="gv-cz-take-head"><span className="gv-avatar">SR</span><strong>Your take</strong><small>The first thing people read</small></div>
                  {n < 0.3 && <p className="gv-cz-take-hint">Why are you sharing this? A line or two is plenty.</p>}
                  {n >= 0.3 && <p className="gv-cz-take-typed">{TYPED_TAKE.slice(0, Math.min(TYPED_TAKE.length, Math.floor((n - 0.3) / 0.3 * TYPED_TAKE.length)))}<span className="gv-caret"/></p>}
                  {n >= 0.55 && <div className="gv-cz-starters gv-anim-up">
                    <span>Start with</span>
                    <button>Fourteen minutes that broke my brain a little.</button>
                    <button>Do you buy this? I can't decide.</button>
                    <button>Watch 4:40, then tell me what you think.</button>
                  </div>}
                </div>
              </div>
              {n > 0.65 && <div className="gv-cz-video-thumb gv-anim-up"><div className="gv-cz-source"><div className="gv-cz-source-thumb">▶</div><div><span className="gv-cz-source-site">▷ YouTube · 14:30</span><strong>Quantum immortality, explained</strong><span className="gv-cz-source-channel">Strange Loops</span></div></div></div>}
            </div>
            <div className={`gv-cz-rail ${n > 0.4 ? 'is-visible' : ''}`}>
              <h4>Add to your gist</h4>
              <small>Picked for this video</small>
              {['The experiment as a diagram', 'A short glossary', 'Further reading', 'Questions to argue about'].map((item, i) =>
                <div key={item} className={`gv-cz-suggest ${n > 0.45 + i * 0.07 ? 'is-visible' : ''}`}>
                  <span className="gv-cz-suggest-icon">{suggestIcons[i]}</span>
                  <div className="gv-cz-suggest-body"><strong>{item}</strong><p>AI-generated enrichment</p></div>
                  <button>+ Add</button>
                </div>
              )}
              {n > 0.72 && <div className="gv-cz-ask gv-anim-up">
                <div className="gv-cz-ask-head"><span className="gv-cz-ask-icon">✦</span> Ask Gisted</div>
                <p>I pulled out a summary, the key moments, where the idea comes from and the catch. I can also draw the experiment as a diagram, add a glossary, or find further reading.</p>
                <div className="gv-cz-ask-chips"><button>Draw the experiment</button><button>Add a glossary</button><button>Make the s…</button></div>
                <div className="gv-cz-ask-input">Ask for a section or a change</div>
              </div>}
            </div>
          </div>
        </div>
      </div>}

      {/* ═══ CONTENT TYPES ═══ */}
      {started && cur.id === 'kinds' && <div className="gv-overlay gv-app-scene">
        <div className="gv-app gv-app-wide">
          <div className="gv-app-header"><span className="gv-glogo">gisted<sup>✦</sup></span></div>
          <div className="gv-app-body gv-kinds-body">
            <h2 className="gv-kinds-title" style={{ opacity: n > 0.05 ? 1 : 0 }}>Made for whatever you're sharing</h2>
            <div className="gv-kinds-grid">
              {kindCards.map((card, i) => <div key={card.title} className={`gv-kind-card ${n > 0.08 + i * 0.1 ? 'is-visible' : ''}`}>
                <div className="gv-kind-thumb" style={{ background: card.bg, color: card.color }}><span className="gv-kind-emoji">{card.thumb}</span><span className="gv-kind-label">{card.label}</span></div>
                <div className="gv-kind-info"><strong>{card.title}</strong><p>{card.sub}</p><button>Try this example</button></div>
              </div>)}
            </div>
          </div>
        </div>
      </div>}

      {/* ═══ SEND ═══ */}
      {started && cur.id === 'send' && <div className="gv-overlay gv-app-scene">
        <div className="gv-app gv-app-wide">
          <div className="gv-app-header">
            <span className="gv-glogo">gisted<sup>✦</sup></span>
            <span className="gv-step-bar"><b className="gv-step-num done">✓</b> Get the gist <span className="gv-step-line">——→</span> <b className="gv-step-num done">✓</b> Customize <span className="gv-step-line">——→</span> <b className="gv-step-num active">3</b> Send</span>
            <span className="gv-app-nav"><span>Back</span><b>Done</b></span>
          </div>
          <div className="gv-app-body gv-send-body">
            <div className="gv-send-main">
              <h2 style={{ opacity: n > 0.05 ? 1 : 0 }}>Send it</h2>
              <p className="gv-send-sub" style={{ opacity: n > 0.1 ? 1 : 0 }}>Pick how it goes out. Copying the link or a post, or sending the email, publishes the page.</p>
              <div className="gv-send-tabs" style={{ opacity: n > 0.15 ? 1 : 0 }}>
                {['🔗 Link', '✉️ Email', '💼 LinkedIn post', '𝕏 X post'].map((t, i) =>
                  <span key={t} className={`gv-send-tab ${i === 3 ? 'active' : ''}`}>{t}</span>
                )}
              </div>
              {n > 0.22 && <div className="gv-send-compose gv-anim-up">
                <div className="gv-send-post-type"><button className="active">One post</button><button>A thread of three</button></div>
                <textarea readOnly value="If many-worlds is true, could you never experience your own death? A 14-minute explainer on quantum immortality, and why even Max Tegmark says it doesn't apply to real life:"/>
                <small>197 of 280, with the link</small>
              </div>}
              {n > 0.38 && <div className="gv-send-preview gv-anim-up">
                <strong>Preview</strong>
                <div className="gv-send-social">
                  <div className="gv-send-social-head"><span className="gv-avatar sm">SR</span><span><b>Sam Rivera</b> @samrivera</span></div>
                  <p className="gv-send-social-text">If many-worlds is true, could you never experience your own death? A 14-minute explainer on quantum immortality…</p>
                  <div className="gv-send-og"><div className="gv-send-og-img"><span>Alive?</span></div><div className="gv-send-og-text"><small>gisted.app</small><strong>Quantum immortality, explained</strong><p>The strangest idea to come out of many-worlds…</p></div></div>
                </div>
              </div>}
            </div>
            <div className={`gv-send-sidebar ${n > 0.25 ? 'is-visible' : ''}`}>
              <h4>Feedback <span className={`gv-toggle ${n > 0.3 ? 'is-on' : ''}`}><span>On</span></span></h4>
              <p>Choose how people can respond. Reading never needs an account; responding takes a quick sign-up.</p>
              {[
                {f: 'Reactions', d: 'One tap: love it, learned something, want to try it.', on: true},
                {f: 'Comments', d: 'A conversation on the page, about the whole thing or one section.', on: true},
                {f: 'A rating scale', d: 'People rate a statement, from strongly disagree to strongly agree.', on: false},
                {f: 'Your questions', d: 'Ask what you want to know. They also close the video.', on: false},
              ].map((item, i) =>
                <div key={item.f} className={`gv-send-fb ${n > 0.35 + i * 0.08 ? 'is-visible' : ''}`}>
                  <span className={`gv-checkbox ${item.on ? 'checked' : ''}`}/><div><strong>{item.f}</strong><p>{item.d}</p></div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>}

      {/* ═══ READER ═══ */}
      {started && cur.id === 'reader' && <div className="gv-overlay gv-app-scene">
        <div className="gv-app gv-app-wide">
          <div className="gv-app-header"><span className="gv-glogo">gisted<sup>✦</sup></span><span className="gv-shared-banner"><span className="gv-avatar sm">SR</span> <b>Sam Rivera</b> shared this with you</span><span className="gv-app-nav"><span>Sign in</span><b>Join Gisted</b></span></div>
          <div className="gv-app-body gv-reader-body">
            <div className="gv-reader-card">
              {n > 0.05 && <div className="gv-reader-checklist gv-anim-up">
                {['Approve the scope: four-step setup, sample data and the setup checklist', 'Lend one Platform engineer for six weeks, from January 11', 'Agree on March 1 for the full launch'].map((item, i) =>
                  <label key={item}><span className={`gv-checkbox ${i === 0 && n > 0.6 ? 'checked' : ''}`}/>{item}</label>
                )}
              </div>}
              {n > 0.15 && <div className="gv-reader-rating gv-anim-up">
                <strong>Tell Sam what you think</strong>
                <div className="gv-reader-rating-inner">
                  <div className="gv-reader-rating-prompt"><span className="gv-avatar sm">SR</span> Sam asks how much you agree</div>
                  <p className="gv-reader-statement">"This plan is ready to present"</p>
                  <div className="gv-rating-row">{[1,2,3,4,5].map(v => <span key={v} className={`gv-rating-btn ${v === 4 && n > 0.45 ? 'selected' : ''}`}><b>{v}</b><small>{['Strongly\ndisagree','Disagree','Neutral','Agree','Strongly\nagree'][v-1]}</small></span>)}</div>
                  {n > 0.5 && <small className="gv-rating-note">Tap a number. Only you and Sam see who said what.</small>}
                </div>
              </div>}
              {n > 0.4 && <div className="gv-reader-question gv-anim-up">
                <strong>Sam's questions</strong>
                <div className="gv-reader-q"><span className="gv-q-num">1</span><span>Is six weeks of a Platform engineer realistic?</span><button>💬 Answer</button></div>
              </div>}
              {n > 0.6 && <div className="gv-reader-reply gv-anim-up"><input readOnly placeholder="Reply to Sam"/><button>Send</button></div>}
              {n > 0.75 && <div className="gv-reader-viral gv-anim-up">
                <strong>Got something to share back?</strong>
                <p>Paste a link and Gisted does the reading. Sam gets a page, not just a link.</p>
                <button>Make a gist</button>
              </div>}
            </div>
          </div>
        </div>
      </div>}

      {/* ═══ DASHBOARD ═══ */}
      {started && cur.id === 'dashboard' && <div className="gv-overlay gv-app-scene">
        <div className="gv-app gv-app-wide">
          <div className="gv-app-header"><span className="gv-glogo">gisted<sup>✦</sup></span><span className="gv-app-nav"><span className="gv-nav-active">Your gists</span><span>Chrome extension</span><b>+ New gist</b></span></div>
          <div className="gv-app-body gv-dash-body">
            <div className="gv-dash-grid">
              {dashCards.map((card, i) => <div key={card.title} className={`gv-dash-card ${n > 0.06 + i * 0.1 ? 'is-visible' : ''}`}>
                <div className="gv-dash-thumb" style={{ background: card.bg }}/>
                <div className="gv-dash-info">
                  <small><span className="gv-dash-type-icon">{card.icon}</span> {card.type}</small>
                  <strong>{card.title}</strong>
                  <div className="gv-dash-meta"><span className={`gv-dash-status ${card.status === 'Shared' ? 'shared' : ''}`}>{card.status}</span><span>{card.date}</span></div>
                  {card.comments != null && <div className="gv-dash-counts">💬 {card.comments} ♡ {card.likes}</div>}
                  {!card.comments && <div className="gv-dash-counts gv-muted">Not sent yet</div>}
                </div>
              </div>)}
            </div>
          </div>
        </div>
      </div>}

      {/* ═══ SYSTEM ═══ */}
      {started && cur.id === 'system' && <div className="gv-overlay gv-system-scene">
        <h4>The system</h4>
        <p className="gv-sys-sub">Designed, engineered, and operated end to end.</p>
        <div className="gv-arch">
          {systemNodes.map((nd, i) => <div key={nd.label} className={`gv-arch-node ${n > 0.05 + i * 0.1 ? 'is-visible' : ''}`} style={{ left: `${nd.x}%`, top: `${nd.y}%` }}><span>{nd.label}</span></div>)}
          {n > 0.2 && <svg className="gv-arch-lines" viewBox="0 0 100 100" preserveAspectRatio="none"><line x1="50" y1="22" x2="50" y2="38"/><line x1="44" y1="45" x2="26" y2="45"/><line x1="56" y1="45" x2="74" y2="45"/><line x1="50" y1="52" x2="50" y2="68"/><line x1="20" y1="52" x2="20" y2="68"/><line x1="80" y1="52" x2="80" y2="68"/></svg>}
        </div>
        {n > 0.7 && <div className="gv-stack-tags gv-anim-up">{['Vite','React','TypeScript','Supabase','Stripe','Vercel'].map(t => <span key={t}>{t}</span>)}</div>}
      </div>}

      {started && <div className="gv-caption"><span>{cur.caption}</span></div>}
      {!started && <div className="gv-start" onClick={begin}><div className="gv-start-logo">✦</div><button><Play size={15} fill="currentColor"/>Play the sizzle reel</button><small>{fmt(TOTAL)} · {scenes.length} scenes</small></div>}
    </div>

    {started && <div className="gv-controls">
      <button onClick={toggle} aria-label={ended ? 'Replay' : playing ? 'Pause' : 'Play'}>{ended ? <RotateCcw size={15}/> : playing ? <Pause size={16}/> : <Play size={16}/>}</button>
      <input ref={progress} type="range" min={0} max={TOTAL} step={.1} defaultValue={0} aria-label="Position" onChange={e => seek(Number(e.target.value))}/>
      <output ref={timerLabel} aria-live="off">{fmt(0)} / {fmt(TOTAL)}</output>
      {hasAudio && <button onClick={() => setMuted(v => !v)} aria-label={muted ? 'Unmute' : 'Mute'}>{muted ? <VolumeX size={14}/> : <Volume2 size={14}/>}</button>}
    </div>}
    {started && <nav className="gv-chapters" aria-label="Sizzle reel chapters">{scenes.map((s, i) => <button key={s.id} aria-pressed={scene === i} onClick={() => seek(STARTS[i])}>{s.label}</button>)}</nav>}
  </section>;
}
