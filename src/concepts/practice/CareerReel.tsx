import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, Maximize2, Minimize2, Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { chapters, chapterAt, CHAPTER_SECONDS, DURATION, formatTime } from './arc/story';
import type { SceneHandle } from './arc/AsciiScene';
import DecodedTitle, { type TitleHandle } from './arc/DecodedTitle';
import ShaderBackdrop, { type BackdropHandle } from './motion/ShaderBackdrop';
import { useScrollExpansion } from './motion/useScrollExpansion';
import './arc/arc.css';
const JourneyScene = lazy(() => import('./arc/JourneyScene'));

export default function CareerReel() {
  const stage = useRef<HTMLDivElement>(null);
  const shell = useRef<HTMLDivElement>(null);
  const backdrop = useRef<BackdropHandle>(null);
  const scene = useRef<SceneHandle | null>(null);
  const title = useRef<TitleHandle | null>(null);
  const elapsed = useRef(0);
  const timerLabel = useRef<HTMLOutputElement>(null);
  const progress = useRef<HTMLInputElement>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [sound, setSound] = useState(false);
  const [atmospherePaused, setAtmospherePaused] = useState(false);
  const [chapter, setChapter] = useState(0);
  const [ended, setEnded] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const reducedRef = useRef(reduced); reducedRef.current = reduced;
  const playingRef = useRef(playing); playingRef.current = playing;
  const chapterRef = useRef(0);
  useScrollExpansion(shell, stage, !started);

  const paint = useCallback((time: number) => {
    elapsed.current = Math.max(0, Math.min(DURATION, time));
    const next = chapterAt(elapsed.current);
    const changed = chapterRef.current !== next;
    if (changed) { chapterRef.current = next; setChapter(next); }
    if (progress.current) {
      progress.current.value = String(elapsed.current);
      progress.current.style.setProperty('--played', `${elapsed.current / DURATION * 100}%`);
      const valueText = `${formatTime(elapsed.current)} of ${formatTime(DURATION)}. ${chapters[next].name}`;
      if (progress.current.getAttribute('aria-valuetext') !== valueText) progress.current.setAttribute('aria-valuetext', valueText);
    }
    const label = `${formatTime(elapsed.current)} / ${formatTime(DURATION)}`;
    if (timerLabel.current && timerLabel.current.value !== label) timerLabel.current.value = label;
    scene.current?.render(elapsed.current, reducedRef.current);
    backdrop.current?.render(elapsed.current);
    if (!changed) title.current?.render(elapsed.current - next * CHAPTER_SECONDS, reducedRef.current || !playingRef.current);
  }, []);
  const onReady = useCallback((handle: SceneHandle) => { scene.current = handle; handle.render(elapsed.current, reducedRef.current); setReady(true); }, []);
  const onError = useCallback(() => { setFailed(true); setPlaying(false); }, []);

  useEffect(() => {
    const change = () => setExpanded(document.fullscreenElement === stage.current);
    document.addEventListener('fullscreenchange', change);
    return () => document.removeEventListener('fullscreenchange', change);
  }, []);
  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => { setReduced(preference.matches); if (preference.matches) setPlaying(false); };
    preference.addEventListener('change', change);
    return () => preference.removeEventListener('change', change);
  }, []);
  useEffect(() => {
    if (!started) return;
    const hide = () => { if (document.hidden) setPlaying(false); };
    document.addEventListener('visibilitychange', hide);
    const observer = new IntersectionObserver(([entry]) => { if (!entry.isIntersecting) setPlaying(false); }, { threshold: 0 });
    if (stage.current) observer.observe(stage.current);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', hide); };
  }, [started]);
  useEffect(() => {
    if (!playing || !ready || reduced || failed) return;
    let frame = 0, previous = performance.now(), lastPaint = 0;
    const tick = (now: number) => {
      const delta = Math.min((now - previous) / 1000, .15); previous = now;
      elapsed.current = Math.min(DURATION, elapsed.current + delta);
      // A small tolerance avoids dropping alternating frames at fractional refresh intervals.
      if (now - lastPaint >= 1000 / 60 - 1 || elapsed.current >= DURATION) { paint(elapsed.current); lastPaint = now; }
      if (elapsed.current >= DURATION) { setPlaying(false); setEnded(true); return; }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, ready, reduced, failed, paint]);
  useEffect(() => {
    const track = audio.current;
    if (!track) return;
    if (sound && playing && ready && !reduced && !failed) {
      track.currentTime = elapsed.current;
      void track.play().catch(() => setSound(false));
    } else track.pause();
  }, [sound, playing, ready, reduced, failed]);

  function seek(time: number) {
    setEnded(time >= DURATION); if (time >= DURATION) setPlaying(false); paint(time);
    if (audio.current && audio.current.readyState > 0) audio.current.currentTime = elapsed.current;
  }
  function begin() { setStarted(true); setPlaying(!reduced); setEnded(false); paint(0); requestAnimationFrame(() => stage.current?.focus({ preventScroll: true })); }
  function toggle() {
    if (reduced || failed) { seek(((chapter + 1) % chapters.length) * CHAPTER_SECONDS); return; }
    if (ended) { seek(0); setPlaying(true); } else setPlaying(value => !value);
  }
  const current = chapters[chapter];
  const manual = reduced || failed;

  return <section className="career-arc" aria-label="Still asking why: a designer’s journey">
    <div className="arc-shell" ref={shell}>
    <div ref={stage} className={`arc-stage ${started ? 'is-started' : ''} ${ready && !failed ? 'is-ready' : ''}`} data-chapter={chapter} tabIndex={started ? 0 : -1} role="group" aria-label={started ? manual ? "Career story player. Use Space for the next chapter, or arrow keys to seek." : "Career story player. Use Space to play or pause, or arrow keys to seek." : "Still asking why"}
      onKeyDown={event => {
        if (event.key === 'Escape' && document.fullscreenElement) { void document.exitFullscreen(); return; }
        if ((event.target as HTMLElement).closest('button,input,a,summary')) return;
        if (started && event.code === 'Space') { event.preventDefault(); toggle(); }
        if (started && ['ArrowLeft', 'ArrowRight'].includes(event.key)) { event.preventDefault(); seek(elapsed.current + (event.key === 'ArrowRight' ? 4 : -4)); }
      }}>
      <ShaderBackdrop ref={backdrop} mode="rays" active={!started && !atmospherePaused} clocked={started}/>
      <picture><source media="(max-width:800px)" srcSet="/portfolio/reel/question-art-mobile.webp"/><img className="arc-poster" src="/portfolio/reel/question-art.webp" alt="" aria-hidden="true" /></picture>
      {started && !failed && <Suspense fallback={null}><JourneyScene onReady={onReady} onError={onError}/></Suspense>}
      <div className="arc-grain" aria-hidden="true" />
      <div className="arc-heading"><span>Will Dzierson / Still asking why</span><span>{started ? current.period : 'A designer’s journey'}</span></div>
      <div className="arc-copy" key={started ? chapter : 'cover'}>
        <span className="arc-credit">{started ? current.credit : 'It all started with a question.'}</span>
        <DecodedTitle ref={title} text={started ? current.title : 'How can this\nbe made better?'} time={elapsed.current - chapter * CHAPTER_SECONDS} animate={started && playing && !manual}/>
        <p>{started ? current.body : 'One question. Twenty-five years of turning curiosity into things people can use.'}</p>
        {started && <span className="arc-evidence">{current.evidence}</span>}
      </div>
      {!started && <button className="arc-start" onClick={begin}><Play size={16} fill="currentColor"/><span>{reduced ? 'Explore the story' : 'Play the story'}<small>{reduced ? 'Six chapters · At your pace' : `${formatTime(DURATION)} · A short story`}</small></span></button>}
      {!started && !reduced && <button className="arc-atmosphere-toggle" aria-label={atmospherePaused ? 'Resume reel atmosphere' : 'Pause reel atmosphere'} aria-pressed={atmospherePaused} onClick={() => setAtmospherePaused(value => !value)}>{atmospherePaused ? <Play size={12}/> : <Pause size={12}/>}</button>}
      {started && !ready && !failed && <p className="arc-loading" role="status">Opening the story…</p>}
      {started && <div className="arc-controls">
        <button onClick={toggle} aria-label={manual ? 'Next chapter' : ended ? 'Replay story' : playing ? 'Pause story' : 'Play story'}>
          {manual ? <ArrowRight size={17}/> : ended ? <RotateCcw size={16}/> : playing ? <Pause size={17}/> : <Play size={17}/>}</button>
        <input ref={progress} type="range" min={0} max={DURATION} step={.1} defaultValue={0} aria-label="Story position" onChange={event => seek(Number(event.target.value))}/>
        <output ref={timerLabel} aria-live="off">{formatTime(0)} / {formatTime(DURATION)}</output>
        {!manual && <button onClick={() => setSound(value => !value)} aria-label={sound ? 'Mute story' : 'Enable story sound'} aria-pressed={sound}>{sound ? <Volume2 size={17}/> : <VolumeX size={17}/>}</button>}
        {document.fullscreenEnabled && <button className="arc-fullscreen" aria-label={expanded ? "Exit fullscreen" : "Expand story"} onClick={() => { if (document.fullscreenElement) void document.exitFullscreen(); else void stage.current?.requestFullscreen().catch(() => {}); }}>{expanded ? <Minimize2 size={15}/> : <Maximize2 size={15}/>}</button>}
      </div>}
      <div className="arc-signature" aria-hidden="true"><span>Curiosity, carried forward.</span><span>{started ? `${String(chapter + 1).padStart(2, '0')} / 06` : '01—06'}</span></div>
    </div>
    </div>
    <div className="arc-meta"><span>Still asking why.</span><span>{started ? manual ? 'Explore at your own pace' : 'Sound optional' : 'An animated story, in six chapters'}</span></div>
    {started && <nav className="arc-chapters" aria-label="Career story chapters">{chapters.map((item, i) => <button key={item.name} aria-pressed={chapter === i} onClick={() => seek(i * CHAPTER_SECONDS + (manual || !playing ? 3.2 : 0))}><span>0{i + 1}</span>{item.name}</button>)}</nav>}
    <details className="arc-transcript"><summary>Read the story</summary><div>{chapters.map(item => <article key={item.name}><span>{item.period} / {item.credit}</span><h3>{item.title.replace(/\n/g, ' ')}</h3><p>{item.body}</p><small>{item.evidence}</small></article>)}<p className="arc-source-note">Adapted from Will’s own reflections, with career details drawn from his résumé and published work. Noodle operated in 2023–2025 and has since dissolved.</p></div></details>
    {started && <audio ref={audio} src="/portfolio/reel/question-score.m4a" preload="none" onError={() => setSound(false)}/>}
  </section>;
}
