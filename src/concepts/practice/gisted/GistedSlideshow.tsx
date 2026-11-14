import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, Maximize2, Minimize2, Pause, Play, RotateCcw } from 'lucide-react';
import { chapters, chapterAt, CHAPTER_SECONDS, DURATION, formatTime } from './story';
import './gisted.css';

export default function GistedSlideshow() {
  const stage = useRef<HTMLDivElement>(null);
  const elapsed = useRef(0);
  const timerLabel = useRef<HTMLOutputElement>(null);
  const progress = useRef<HTMLInputElement>(null);
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [chapter, setChapter] = useState(0);
  const [ended, setEnded] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [imageReady, setImageReady] = useState<Record<number, boolean>>({});
  const playingRef = useRef(playing);
  playingRef.current = playing;
  const chapterRef = useRef(0);

  const paint = useCallback((time: number) => {
    elapsed.current = Math.max(0, Math.min(DURATION, time));
    const next = chapterAt(elapsed.current);
    if (chapterRef.current !== next) { chapterRef.current = next; setChapter(next); }
    if (progress.current) {
      progress.current.value = String(elapsed.current);
      progress.current.style.setProperty('--played', `${elapsed.current / DURATION * 100}%`);
    }
    const label = `${formatTime(elapsed.current)} / ${formatTime(DURATION)}`;
    if (timerLabel.current && timerLabel.current.value !== label) timerLabel.current.value = label;
  }, []);

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
    if (!playing || reduced) return;
    let frame = 0, previous = performance.now();
    const tick = (now: number) => {
      const delta = Math.min((now - previous) / 1000, .15);
      previous = now;
      elapsed.current = Math.min(DURATION, elapsed.current + delta);
      paint(elapsed.current);
      if (elapsed.current >= DURATION) { setPlaying(false); setEnded(true); return; }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, reduced, paint]);

  useEffect(() => {
    chapters.forEach((ch, i) => {
      const img = new Image();
      img.onload = () => setImageReady(prev => ({ ...prev, [i]: true }));
      img.src = ch.image;
    });
  }, []);

  function seek(time: number) {
    setEnded(time >= DURATION);
    if (time >= DURATION) setPlaying(false);
    paint(time);
  }
  function begin() { setStarted(true); setPlaying(!reduced); setEnded(false); paint(0); stage.current?.focus({ preventScroll: true }); }
  function toggle() {
    if (reduced) { seek(((chapter + 1) % chapters.length) * CHAPTER_SECONDS); return; }
    if (ended) { seek(0); setPlaying(true); } else setPlaying(v => !v);
  }

  const current = chapters[chapter];
  const manual = reduced;

  return <section className="gisted-slideshow" aria-label="Gisted: the design and development story">
    <div ref={stage} className={`gisted-stage ${started ? 'is-started' : ''}`} tabIndex={started ? 0 : -1}
      onKeyDown={e => {
        if (e.key === 'Escape' && document.fullscreenElement) { void document.exitFullscreen(); return; }
        if ((e.target as HTMLElement).closest('button,input')) return;
        if (started && e.code === 'Space') { e.preventDefault(); toggle(); }
        if (started && ['ArrowLeft', 'ArrowRight'].includes(e.key)) { e.preventDefault(); seek(elapsed.current + (e.key === 'ArrowRight' ? 3 : -3)); }
      }}>

      <div className="gisted-scene">
        <div className="gisted-sparkle" style={{ top: '12%', left: '8%' }} aria-hidden="true"/>
        <div className="gisted-sparkle" style={{ top: '20%', right: '12%' }} aria-hidden="true"/>
        <div className="gisted-sparkle" style={{ bottom: '30%', left: '15%' }} aria-hidden="true"/>
        <div className="gisted-sparkle" style={{ top: '35%', right: '6%' }} aria-hidden="true"/>

        {started && chapters.map((ch, i) =>
          <div key={i} className={`gisted-scene-image ${i === chapter ? 'is-visible' : 'is-entering'}`}
            style={{ position: i === chapter ? 'relative' : 'absolute', display: i === chapter ? 'block' : 'none' }}>
            {imageReady[i] && <img src={ch.image} alt={ch.name} loading={i === 0 ? 'eager' : 'lazy'}/>}
          </div>
        )}
        {!started && <div className="gisted-scene-image is-visible">
          <img src={chapters[0].image} alt="Gisted homepage"/>
        </div>}
      </div>

      <div className="gisted-heading">
        <span>Gisted / Vibrant Labworks (Founder)</span>
        <span>{started ? current.period : 'The design story'}</span>
      </div>

      <div className="gisted-copy">
        <span className="arc-credit">{started ? current.credit : 'Don\'t just send a link. Send the gist.'}</span>
        <h3>{started ? current.title.replace(/\n/g, '\n') : 'Don\'t just send\na link.'}</h3>
        <p>{started ? current.body : 'A product that turns links into pages people actually open. Designed and built end to end.'}</p>
        {started && <span className="gisted-evidence">{current.evidence}</span>}
      </div>

      {!started && <div className="gisted-start" onClick={begin}>
        <button><Play size={15} fill="currentColor"/>{reduced ? 'Explore the story' : 'Play the story'}</button>
        <small>{reduced ? 'Six chapters · At your pace' : `${formatTime(DURATION)} · Six chapters`}</small>
      </div>}
    </div>

    {started && <div className="gisted-controls">
      <button onClick={toggle} aria-label={manual ? 'Next chapter' : ended ? 'Replay' : playing ? 'Pause' : 'Play'}>
        {manual ? <ArrowRight size={16}/> : ended ? <RotateCcw size={15}/> : playing ? <Pause size={16}/> : <Play size={16}/>}
      </button>
      <input ref={progress} type="range" min={0} max={DURATION} step={.1} defaultValue={0} aria-label="Story position" onChange={e => seek(Number(e.target.value))}/>
      <output ref={timerLabel} aria-live="off">{formatTime(0)} / {formatTime(DURATION)}</output>
      {document.fullscreenEnabled && <button aria-label={expanded ? 'Exit fullscreen' : 'Fullscreen'} onClick={() => {
        if (document.fullscreenElement) void document.exitFullscreen();
        else void stage.current?.requestFullscreen().catch(() => {});
      }}>{expanded ? <Minimize2 size={14}/> : <Maximize2 size={14}/>}</button>}
    </div>}

    {started && <nav className="gisted-chapters" aria-label="Story chapters">
      {chapters.map((ch, i) => <button key={ch.name} aria-pressed={chapter === i} onClick={() => seek(i * CHAPTER_SECONDS)}>
        <span>0{i + 1}</span> {ch.name}
      </button>)}
    </nav>}

    <details className="gisted-transcript"><summary>Read the story</summary><div>
      {chapters.map(ch => <article key={ch.name}>
        <span>{ch.period} / {ch.credit}</span>
        <h4>{ch.title.replace(/\n/g, ' ')}</h4>
        <p>{ch.body}</p>
        <small>{ch.evidence}</small>
      </article>)}
    </div></details>
  </section>;
}
