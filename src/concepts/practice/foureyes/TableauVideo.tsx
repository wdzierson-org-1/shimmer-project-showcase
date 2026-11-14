import { useCallback, useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import './foureyes.css';

const PHASE_SECONDS = 7;
const phases = [
  { caption: 'Tableau — a gaze and voice canvas for Mac', phase: 'title' },
  { caption: 'An animated dot field with 3D primitives, object lock, and grid settlement', phase: 'canvas' },
  { caption: 'GPT-Live voice conversation edits the scene in real time', phase: 'voice' },
  { caption: 'A painterly Three.js renderer inspired by Breath of the Wild', phase: 'painterly' },
  { caption: 'Forest, jungle, beach, Japanese house — voice-driven environments', phase: 'environments' },
  { caption: 'Undoable rain, sun rays, wind. Dawn to midnight. Sound that follows biome and time.', phase: 'atmosphere' },
  { caption: 'Hybrid scenes: procedural scenery with style-conditioned Spark backgrounds', phase: 'hybrid' },
  { caption: 'H3 Max Director: describe a scene aloud, steer one continuous live video stream', phase: 'director' },
  { caption: 'An experiment in what happens when eyes, voice, and imagination share a canvas.', phase: 'close' },
];
const DURATION = phases.length * PHASE_SECONDS;

function phaseAt(time: number) { return Math.max(0, Math.min(phases.length - 1, Math.floor(time / PHASE_SECONDS))); }
function formatTime(time: number) { return `${String(Math.floor(time / 60)).padStart(2, '0')}:${String(Math.floor(time % 60)).padStart(2, '0')}`; }

export default function TableauVideo() {
  const stage = useRef<HTMLDivElement>(null);
  const elapsed = useRef(0);
  const timerLabel = useRef<HTMLOutputElement>(null);
  const progress = useRef<HTMLInputElement>(null);
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [phase, setPhase] = useState(0);
  const [ended, setEnded] = useState(false);
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const phaseRef = useRef(0);

  const paint = useCallback((time: number) => {
    elapsed.current = Math.max(0, Math.min(DURATION, time));
    const next = phaseAt(elapsed.current);
    if (phaseRef.current !== next) { phaseRef.current = next; setPhase(next); }
    if (progress.current) {
      progress.current.value = String(elapsed.current);
      progress.current.style.setProperty('--played', `${elapsed.current / DURATION * 100}%`);
    }
    const label = `${formatTime(elapsed.current)} / ${formatTime(DURATION)}`;
    if (timerLabel.current && timerLabel.current.value !== label) timerLabel.current.value = label;
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

  function seek(time: number) { setEnded(time >= DURATION); if (time >= DURATION) setPlaying(false); paint(time); }
  function begin() { setStarted(true); setPlaying(!reduced); setEnded(false); paint(0); stage.current?.focus({ preventScroll: true }); }
  function toggle() {
    if (reduced) { seek(((phase + 1) % phases.length) * PHASE_SECONDS); return; }
    if (ended) { seek(0); setPlaying(true); } else setPlaying(v => !v);
  }

  const currentPhase = phases[phase];
  const phaseTime = elapsed.current - phase * PHASE_SECONDS;
  const norm = Math.min(phaseTime / PHASE_SECONDS, 1);

  const skyColor = currentPhase.phase === 'atmosphere'
    ? norm < 0.3 ? '#4a6fa5' : norm < 0.6 ? '#ff8844' : '#1a1a3a'
    : currentPhase.phase === 'painterly' || currentPhase.phase === 'environments'
    ? '#2a4a2a' : '#1c1c1e';

  return <section className="foureyes-video" aria-label="Tableau: a gaze and voice canvas">
    <div ref={stage} className={`foureyes-canvas ${started ? 'is-started' : ''}`} tabIndex={started ? 0 : -1}
      style={{ background: started ? skyColor : '#1c1c1e', transition: 'background 1.5s ease' }}
      onKeyDown={e => {
        if ((e.target as HTMLElement).closest('button,input')) return;
        if (started && e.code === 'Space') { e.preventDefault(); toggle(); }
        if (started && ['ArrowLeft', 'ArrowRight'].includes(e.key)) { e.preventDefault(); seek(elapsed.current + (e.key === 'ArrowRight' ? 3 : -3)); }
      }}>

      {/* Dot field grid for canvas phase */}
      {started && currentPhase.phase === 'canvas' && <div className="tableau-grid" aria-hidden="true"/>}

      {/* 3D primitives */}
      {started && (currentPhase.phase === 'canvas' || currentPhase.phase === 'voice') && <div className="tableau-objects" aria-hidden="true">
        <div className="foureyes-primitive tableau-sphere" style={{ width: 36, height: 36, left: '38%', top: '42%', opacity: norm > 0.2 ? 1 : 0 }}/>
        <div className="foureyes-primitive" style={{ left: '50%', top: '45%', opacity: norm > 0.4 ? 1 : 0 }}>
          <div className="tableau-cake" style={{ width: 44, height: 22 }}>
            <div className="tableau-candle" style={{ left: 10 }}/>
            <div className="tableau-candle" style={{ left: 20 }}/>
            <div className="tableau-candle" style={{ left: 30 }}/>
          </div>
        </div>
        <div className="foureyes-primitive tableau-torus" style={{ width: 28, height: 28, left: '62%', top: '48%', opacity: norm > 0.6 ? 1 : 0 }}/>
      </div>}

      {/* Forest/nature scenes */}
      {started && (currentPhase.phase === 'painterly' || currentPhase.phase === 'environments') && <div className="tableau-objects" aria-hidden="true">
        <div className="foureyes-primitive tableau-tree" style={{ left: '20%', bottom: '20%', transform: `scale(${1.5 + norm * 0.5})`, opacity: 0.7 }}/>
        <div className="foureyes-primitive tableau-tree" style={{ left: '35%', bottom: '18%', transform: `scale(${2 + norm * 0.3})`, opacity: 0.6 }}/>
        <div className="foureyes-primitive tableau-tree" style={{ left: '65%', bottom: '22%', transform: `scale(${1.8 + norm * 0.4})`, opacity: 0.65 }}/>
        <div className="foureyes-primitive tableau-tree" style={{ left: '80%', bottom: '20%', transform: `scale(${1.3 + norm * 0.6})`, opacity: 0.55 }}/>
        {currentPhase.phase === 'environments' && <>
          <div className="foureyes-primitive tableau-water" style={{ width: '40%', height: '8%', left: '30%', bottom: '12%', opacity: norm > 0.3 ? 0.5 : 0 }}/>
          <div className="foureyes-primitive tableau-sphere" style={{ width: 20, height: 20, left: '45%', bottom: '28%', opacity: norm > 0.5 ? 0.8 : 0, background: 'radial-gradient(circle at 35% 35%, #c97a58, #8b5a3a)' }}/>
        </>}
      </div>}

      {/* Rain for atmosphere */}
      {started && currentPhase.phase === 'atmosphere' && norm > 0.3 && <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', opacity: 0.4 }} aria-hidden="true">
        {Array.from({ length: 30 }, (_, i) => <div key={i} style={{
          position: 'absolute', width: 1, height: 12 + Math.random() * 8,
          background: '#ffffff40', left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
          animation: `rain-fall ${0.6 + Math.random() * 0.4}s linear infinite`,
          animationDelay: `${Math.random() * -2}s`,
        }}/>)}
        <style>{`@keyframes rain-fall{0%{transform:translateY(-20px)}100%{transform:translateY(100vh)}}`}</style>
      </div>}

      {/* Voice indicator for voice/director phases */}
      {started && (currentPhase.phase === 'voice' || currentPhase.phase === 'director') && <div className="foureyes-voice" aria-hidden="true">
        <div className="foureyes-voice-bars"><div className="foureyes-voice-bar"/><div className="foureyes-voice-bar"/><div className="foureyes-voice-bar"/><div className="foureyes-voice-bar"/></div>
        <span>{currentPhase.phase === 'director' ? 'Directing' : 'GPT-Live'}</span>
      </div>}

      {/* Title/close overlays */}
      {(!started || currentPhase.phase === 'title') && <div className="foureyes-title">
        <h3>Tableau</h3>
        <p>A gaze and voice canvas for Mac</p>
        <small>Native Swift · GPT-Live · Three.js · SceneKit</small>
      </div>}

      {started && currentPhase.phase === 'hybrid' && <div className="foureyes-title" style={{ background: '#00000060' }}>
        <h3>Hybrid scenes</h3>
        <p>Editable procedural scenery with style-conditioned, locally cached Spark backgrounds. Open Forest glade, or describe a scene incrementally.</p>
        <small>World Labs Gaussian splats · Procedural Three.js · Native WebKit host</small>
      </div>}

      {started && currentPhase.phase === 'director' && <div className="foureyes-title" style={{ background: '#00000060' }}>
        <h3>Director mode</h3>
        <p>Start blank. Describe a scene aloud. Steer one continuous H3 Max Director stream through fal. Spoken clauses update upcoming video segments in real time.</p>
        <small>Minimax H3 Max · WebRTC · Cumulative scene intent</small>
      </div>}

      {started && currentPhase.phase === 'close' && <div className="foureyes-title">
        <h3>Eyes, voice,\nand imagination.</h3>
        <p>From a dot field to forest glades. From typed commands to spoken worlds. An ongoing experiment in creative input.</p>
        <small>4Eyes project · Will Dzierson</small>
      </div>}

      {/* Caption */}
      {started && <div className="foureyes-caption"><span>{currentPhase.caption}</span></div>}

      {!started && <div className="foureyes-start" onClick={begin}>
        <button><Play size={15} fill="currentColor"/>Play overview</button>
        <small>{formatTime(DURATION)} · Nine scenes</small>
        <span>Tableau · World creation app</span>
      </div>}
    </div>

    {started && <div className="foureyes-controls">
      <button onClick={toggle} aria-label={ended ? 'Replay' : playing ? 'Pause' : 'Play'}>
        {ended ? <RotateCcw size={15}/> : playing ? <Pause size={16}/> : <Play size={16}/>}
      </button>
      <input ref={progress} type="range" min={0} max={DURATION} step={.1} defaultValue={0} aria-label="Position" onChange={e => seek(Number(e.target.value))}/>
      <output ref={timerLabel} aria-live="off">{formatTime(0)} / {formatTime(DURATION)}</output>
    </div>}
  </section>;
}
