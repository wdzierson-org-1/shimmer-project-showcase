import { useCallback, useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import './foureyes.css';

const PHASE_SECONDS = 6;
const phases = [
  { caption: '4Eyes — a gaze-assisted voice control toolkit for Mac and iPhone', phase: 'title' },
  { caption: 'The iPhone estimates gaze direction using ARKit face tracking', phase: 'phone' },
  { caption: 'The Mac learns a mapping from the phone\'s gaze to its primary display', phase: 'calibrate' },
  { caption: 'Nine fitting positions, followed by four independent accuracy checks', phase: 'calibrate-run' },
  { caption: 'A candidate target is highlighted. An explicit voice command confirms.', phase: 'interact' },
  { caption: 'Hysteresis retains locks across short drift. Short blinks preserve focus.', phase: 'lock' },
  { caption: 'Reusable Swift SDK — Core, Apple, SwiftUI, and optional Jev adapter', phase: 'sdk' },
  { caption: 'MIT-licensed. An experiment in gaze as a first-class input channel.', phase: 'close' },
];
const DURATION = phases.length * PHASE_SECONDS;

function phaseAt(time: number) { return Math.max(0, Math.min(phases.length - 1, Math.floor(time / PHASE_SECONDS))); }
function formatTime(time: number) { return `${String(Math.floor(time / 60)).padStart(2, '0')}:${String(Math.floor(time % 60)).padStart(2, '0')}`; }

const DOT_COUNT = 80;
const dots = Array.from({ length: DOT_COUNT }, (_, i) => ({
  x: 8 + (i % 10) * 9.2 + Math.random() * 3,
  y: 8 + Math.floor(i / 10) * 11 + Math.random() * 3,
}));

export default function FourEyesVideo() {
  const stage = useRef<HTMLDivElement>(null);
  const elapsed = useRef(0);
  const timerLabel = useRef<HTMLOutputElement>(null);
  const progress = useRef<HTMLInputElement>(null);
  const gazeRef = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [phase, setPhase] = useState(0);
  const [ended, setEnded] = useState(false);
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [activeDot, setActiveDot] = useState(-1);
  const [lockedDot, setLockedDot] = useState(-1);
  const [calPoint, setCalPoint] = useState(-1);
  const [calDone, setCalDone] = useState<number[]>([]);
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

    const phaseTime = elapsed.current - next * PHASE_SECONDS;
    const norm = phaseTime / PHASE_SECONDS;

    if (gazeRef.current) {
      const currentPhase = phases[next].phase;
      if (currentPhase === 'interact' || currentPhase === 'lock') {
        const targetDot = Math.floor(norm * 6) % DOT_COUNT;
        const dot = dots[Math.min(targetDot + 30, DOT_COUNT - 1)];
        gazeRef.current.style.left = `${dot.x}%`;
        gazeRef.current.style.top = `${dot.y}%`;
        gazeRef.current.classList.remove('is-hidden');
        gazeRef.current.classList.toggle('is-locked', currentPhase === 'lock' && norm > 0.4);
        setActiveDot(targetDot + 30);
        setLockedDot(currentPhase === 'lock' && norm > 0.4 ? targetDot + 30 : -1);
      } else if (currentPhase === 'calibrate-run') {
        const point = Math.min(Math.floor(norm * 9), 8);
        const px = (point % 3) * 37.5 + 18.75;
        const py = Math.floor(point / 3) * 30 + 20;
        gazeRef.current.style.left = `${px}%`;
        gazeRef.current.style.top = `${py}%`;
        gazeRef.current.classList.remove('is-hidden', 'is-locked');
        setCalPoint(point);
        setCalDone(prev => prev.includes(point - 1) || point === 0 ? prev : [...prev, point - 1]);
        setActiveDot(-1);
        setLockedDot(-1);
      } else {
        gazeRef.current.classList.add('is-hidden');
        setActiveDot(-1);
        setLockedDot(-1);
        setCalPoint(-1);
        if (next < 2) setCalDone([]);
      }
    }
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
  const showDots = ['interact', 'lock', 'phone'].includes(currentPhase.phase);
  const showCal = ['calibrate', 'calibrate-run'].includes(currentPhase.phase);

  return <section className="foureyes-video" aria-label="4Eyes: gaze-assisted voice control">
    <div ref={stage} className={`foureyes-canvas ${started ? 'is-started' : ''}`} tabIndex={started ? 0 : -1}
      onKeyDown={e => {
        if ((e.target as HTMLElement).closest('button,input')) return;
        if (started && e.code === 'Space') { e.preventDefault(); toggle(); }
        if (started && ['ArrowLeft', 'ArrowRight'].includes(e.key)) { e.preventDefault(); seek(elapsed.current + (e.key === 'ArrowRight' ? 3 : -3)); }
      }}>

      {/* Dot field */}
      {started && showDots && <div className="foureyes-dots" aria-hidden="true">
        {dots.map((d, i) => <div key={i} className={`foureyes-dot ${i === activeDot ? 'is-active' : ''} ${i === lockedDot ? 'is-locked' : ''}`}
          style={{ left: `${d.x}%`, top: `${d.y}%` }}/>)}
      </div>}

      {/* Calibration grid */}
      {started && showCal && <div className="foureyes-phase is-active">
        <div className="foureyes-calibration">
          {Array.from({ length: 9 }, (_, i) =>
            <div key={i} className={`foureyes-cal-point ${i === calPoint ? 'is-active' : ''} ${calDone.includes(i) ? 'is-done' : ''}`}/>
          )}
        </div>
      </div>}

      {/* Title phase */}
      {(!started || currentPhase.phase === 'title') && <div className={`foureyes-title ${started ? '' : ''}`}>
        <h3>4Eyes</h3>
        <p>Gaze-assisted voice control for Mac and iPhone</p>
        <small>Swift toolkit · ARKit · MIT license</small>
      </div>}

      {/* SDK phase */}
      {started && currentPhase.phase === 'sdk' && <div className="foureyes-title">
        <h3>A reusable SDK</h3>
        <p>FourEyesCore, FourEyesApple, FourEyesSwiftUI, and the optional FourEyesJev adapter. Add gaze interaction to any Mac or iOS app.</p>
        <small>Swift Package · No third-party dependencies</small>
      </div>}

      {/* Close phase */}
      {started && currentPhase.phase === 'close' && <div className="foureyes-title">
        <h3>An experiment in\ngaze as input.</h3>
        <p>Start with large targets. Measure accuracy. Then try real controls.</p>
        <small>MIT license · Pre-1.0 · Physical evaluation ongoing</small>
      </div>}

      {/* Phone indicator */}
      {started && ['phone', 'calibrate', 'calibrate-run', 'interact', 'lock'].includes(currentPhase.phase) &&
        <div className="foureyes-phone" aria-hidden="true">
          <div className="foureyes-phone-face"/>
          <span className="foureyes-phone-label">iPhone · ARKit</span>
        </div>}

      {/* Gaze cursor */}
      <div ref={gazeRef} className="foureyes-gaze is-hidden" aria-hidden="true"/>

      {/* Voice indicator */}
      {started && currentPhase.phase === 'lock' && <div className="foureyes-voice" aria-hidden="true">
        <div className="foureyes-voice-bars"><div className="foureyes-voice-bar"/><div className="foureyes-voice-bar"/><div className="foureyes-voice-bar"/><div className="foureyes-voice-bar"/></div>
        <span>Listening</span>
      </div>}

      {/* Caption */}
      {started && <div className="foureyes-caption"><span>{currentPhase.caption}</span></div>}

      {!started && <div className="foureyes-start" onClick={begin}>
        <button><Play size={15} fill="currentColor"/>Play overview</button>
        <small>{formatTime(DURATION)} · Eight scenes</small>
        <span>4Eyes Mac app · Vision tracking</span>
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
