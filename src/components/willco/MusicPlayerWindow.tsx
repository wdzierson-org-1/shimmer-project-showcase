import { useEffect, useRef, useState, useCallback } from 'react';

const CRT_FG = '#88c0d0';
const CRT_FG_DIM = 'rgba(136,192,208,0.5)';
const CRT_FG_GHOST = 'rgba(136,192,208,0.2)';
const CRT_BG = '#0e0e14';

const TRACK = {
  title: 'On the Nature of Daylight',
  artist: 'Max Richter',
  album: 'The Blue Notebooks',
  year: 2004,
  src: 'https://uilvozcryifnpldfpwiz.supabase.co/storage/v1/object/public/content_assets/music/Max_Richter__On_The_Nature_Of_Daylight%20copy.mp3',
};

const EQ_BANDS = 16;
const ZERO_BARS = Array(EQ_BANDS).fill(0);

function fmtTime(sec: number) {
  if (!isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function TapeReel({ angle, size = 68, windRatio = 0.5 }: { angle: number; size?: number; windRatio?: number }) {
  const cx = size / 2;
  const outerR = cx - 5;
  const hubR = outerR * 0.22;
  const tapeInnerR = hubR + 2;
  const tapeOuterR = tapeInnerR + (outerR - tapeInnerR - 4) * Math.max(0, Math.min(1, windRatio));
  const spokeCount = 5;
  const spokes = Array.from({ length: spokeCount }, (_, i) => {
    const a = (i / spokeCount) * Math.PI * 2 + angle;
    return {
      x1: cx + Math.cos(a) * (hubR + 1),
      y1: cx + Math.sin(a) * (hubR + 1),
      x2: cx + Math.cos(a) * (hubR + (tapeOuterR - hubR) * 0.6),
      y2: cx + Math.sin(a) * (hubR + (tapeOuterR - hubR) * 0.6),
    };
  });
  const ringCount = Math.max(1, Math.round((tapeOuterR - tapeInnerR) / 3));
  const rings = Array.from({ length: ringCount }, (_, i) => ({
    r: tapeInnerR + ((tapeOuterR - tapeInnerR) * (i + 0.5)) / ringCount,
    opacity: 0.12 + (i / ringCount) * 0.1,
  }));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle cx={cx} cy={cx} r={outerR} stroke={CRT_FG} strokeWidth="0.8" fill="none" opacity="0.35" />
      {tapeOuterR > tapeInnerR + 1 && (
        <circle cx={cx} cy={cx} r={(tapeInnerR + tapeOuterR) / 2}
          stroke={CRT_FG} strokeWidth={tapeOuterR - tapeInnerR} fill="none" opacity="0.18" />
      )}
      {rings.map((rng, i) => (
        <circle key={i} cx={cx} cy={cx} r={rng.r} stroke={CRT_FG} strokeWidth="0.5" fill="none" opacity={rng.opacity} />
      ))}
      <circle cx={cx} cy={cx} r={hubR} stroke={CRT_FG} strokeWidth="1" fill={CRT_BG} opacity="0.9" />
      {spokes.map((s, i) => (
        <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={CRT_FG} strokeWidth="0.9" opacity="0.7" />
      ))}
      <circle cx={cx} cy={cx} r={2.5} fill={CRT_FG} opacity="0.6" />
    </svg>
  );
}

function EQDisplay({ bars }: { bars: number[] }) {
  const barW = 6;
  const gap = 2;
  const maxH = 48;
  const totalW = bars.length * (barW + gap) - gap;
  return (
    <svg width={totalW} height={maxH + 4} viewBox={`0 0 ${totalW} ${maxH + 4}`} aria-hidden="true">
      {bars.map((level, i) => {
        const h = Math.max(2, level * maxH);
        const y = maxH - h + 2;
        return (
          <rect key={i} x={i * (barW + gap)} y={y} width={barW} height={h}
            fill={CRT_FG} opacity={0.25 + level * 0.7}
            style={{ transition: 'height 0.06s, y 0.06s, opacity 0.06s' }} />
        );
      })}
    </svg>
  );
}

function CtrlBtn({ children, onClick, active, disabled }: {
  children: React.ReactNode; onClick: () => void; active?: boolean; disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        fontFamily: 'IBM Plex Mono, monospace',
        fontSize: 13,
        color: active ? CRT_BG : disabled ? 'rgba(136,192,208,0.25)' : CRT_FG,
        background: active ? CRT_FG : 'none',
        border: `1px solid ${active ? CRT_FG : 'rgba(136,192,208,0.35)'}`,
        padding: '5px 14px',
        cursor: disabled ? 'default' : 'pointer',
        letterSpacing: '0.03em',
        transition: 'background 0.1s, color 0.1s',
        minWidth: 42,
        textAlign: 'center',
        lineHeight: 1,
      }}
      onMouseEnter={(e) => {
        if (!active && !disabled) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(136,192,208,0.1)';
      }}
      onMouseLeave={(e) => {
        if (!active && !disabled) (e.currentTarget as HTMLButtonElement).style.background = 'none';
      }}
    >
      {children}
    </button>
  );
}

export function MusicPlayerWindow() {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [reelAngle, setReelAngle] = useState(0);
  const [eqBars, setEqBars] = useState<number[]>(ZERO_BARS);
  const [blink, setBlink] = useState(true);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animRef = useRef<number>(0);
  const lastTRef = useRef<number>(0);
  const playingRef = useRef(false);
  const bandSeedsRef = useRef<number[]>(
    Array.from({ length: EQ_BANDS }, (_, i) => (i * 1.618 + 0.5) % 1)
  );

  const windRatio = duration > 0 ? progress : 0.5;

  useEffect(() => {
    const id = window.setInterval(() => setBlink((b) => !b), 600);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const tick = (t: number) => {
      const dt = Math.min((t - lastTRef.current) / 1000, 0.1);
      lastTRef.current = t;
      const ts = t / 1000;

      if (playingRef.current) {
        setReelAngle((a) => a + dt * 1.2 * Math.PI * 2);

        setEqBars(bandSeedsRef.current.map((seed, i) => {
          const bandPos = i / EQ_BANDS;
          const baseAmp = 0.55 - bandPos * 0.35;
          const speed1 = 0.7 + seed * 1.4;
          const speed2 = 1.3 + seed * 2.1;
          const speed3 = 0.4 + bandPos * 1.8;
          const val = baseAmp
            + Math.sin(ts * speed1 + seed * 6.28) * 0.18
            + Math.sin(ts * speed2 + seed * 3.14) * 0.12
            + Math.sin(ts * speed3 + i * 0.5) * 0.08
            + (Math.random() - 0.5) * 0.06;
          return Math.max(0.02, Math.min(1, val));
        }));
      } else {
        setEqBars((prev) => {
          if (prev === ZERO_BARS) return prev;
          const next = prev.map((v) => Math.max(0, v - dt * 5));
          return next.every((v) => v === 0) ? ZERO_BARS : next;
        });
      }

      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (playing) {
      audio.pause();
      setPlaying(false);
      playingRef.current = false;
    } else {
      try {
        await audio.play();
        setPlaying(true);
        playingRef.current = true;
      } catch (err) {
        console.error('Audio play error:', err);
      }
    }
  }, [playing]);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setPlaying(false);
    playingRef.current = false;
    setElapsed(0);
    setProgress(0);
  }, []);

  const seek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * duration;
    setProgress(ratio);
    setElapsed(ratio * duration);
  }, [duration]);

  const statusLine = playing
    ? `NOW PLAYING ${blink ? '▶' : ' '}`
    : elapsed > 0 ? 'PAUSED' : 'READY';

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: CRT_BG,
      color: CRT_FG,
      fontFamily: 'IBM Plex Mono, monospace',
      padding: '14px 16px',
      gap: 12,
      boxSizing: 'border-box',
      overflow: 'hidden',
    }}>
      <audio
        ref={audioRef}
        src={TRACK.src}
        preload="auto"
        onLoadedMetadata={() => {
          if (audioRef.current) setDuration(audioRef.current.duration);
        }}
        onTimeUpdate={() => {
          const audio = audioRef.current;
          if (audio && audio.duration > 0) {
            setElapsed(audio.currentTime);
            setProgress(audio.currentTime / audio.duration);
          }
        }}
        onEnded={() => {
          setPlaying(false);
          playingRef.current = false;
          setElapsed(0);
          setProgress(0);
        }}
      />

      {/* Header */}
      <div style={{ fontSize: 7, letterSpacing: '0.28em', color: CRT_FG_GHOST, textTransform: 'uppercase' }}>
        WILLCO AUDIO — TAPE DECK MK II
      </div>

      {/* Tape reels + EQ */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px' }}>
        <TapeReel angle={reelAngle} size={68} windRatio={1 - windRatio * 0.7} />
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'flex-end' }}>
          <EQDisplay bars={eqBars} />
        </div>
        <TapeReel angle={-reelAngle * 0.9} size={68} windRatio={0.3 + windRatio * 0.7} />
      </div>

      {/* Now playing */}
      <div style={{ border: `1px solid rgba(136,192,208,0.18)`, padding: '9px 11px', background: 'rgba(136,192,208,0.03)' }}>
        <div style={{ fontSize: 7, letterSpacing: '0.22em', color: CRT_FG_GHOST, marginBottom: 5, textTransform: 'uppercase' }}>
          {statusLine}
        </div>
        <div style={{ fontSize: 12, letterSpacing: '0.04em', color: CRT_FG, lineHeight: 1.35, marginBottom: 3 }}>
          {TRACK.title}
        </div>
        <div style={{ fontSize: 8, color: CRT_FG_DIM, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          {TRACK.artist} · {TRACK.album} · {TRACK.year}
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div onClick={seek} style={{
          height: 3, background: 'rgba(136,192,208,0.09)',
          border: `1px solid rgba(136,192,208,0.18)`,
          cursor: 'pointer', position: 'relative', marginBottom: 5,
        }}>
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            width: `${progress * 100}%`,
            background: 'rgba(136,192,208,0.55)',
            transition: 'width 0.25s linear',
          }} />
          <div style={{
            position: 'absolute', left: `${progress * 100}%`, top: -4,
            width: 1, height: 11,
            background: blink && playing ? CRT_FG : 'transparent',
            transform: 'translateX(-0.5px)', transition: 'background 0.3s',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 7, color: CRT_FG_GHOST, letterSpacing: '0.1em' }}>
          <span>{fmtTime(elapsed)}</span>
          <span>{fmtTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
        <CtrlBtn onClick={stop}>■</CtrlBtn>
        <CtrlBtn onClick={togglePlay} active={playing}>
          {playing ? '⏸' : '▶'}
        </CtrlBtn>
      </div>

      {/* Footer */}
      <div style={{
        borderTop: `1px solid rgba(136,192,208,0.1)`, paddingTop: 8,
        fontSize: 7, color: CRT_FG_GHOST, letterSpacing: '0.12em',
        textTransform: 'uppercase', textAlign: 'center', lineHeight: 1.8,
      }}>
        STEREO · MP3 · 44.1 kHz
      </div>
    </div>
  );
}
