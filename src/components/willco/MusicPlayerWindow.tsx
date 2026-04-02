import { useEffect, useRef, useState, useCallback } from 'react';

const CRT_FG = '#88c0d0';
const CRT_FG_DIM = 'rgba(136,192,208,0.5)';
const CRT_FG_GHOST = 'rgba(136,192,208,0.2)';
const CRT_BG = '#0e0e14';

// Curated playlist — update URLs to real audio files as desired.
// Gracefully degrades to visual-only animation if src is empty.
const PLAYLIST = [
  { title: 'Midnight Rambler',      artist: 'Rolling Stones',  duration: 311, src: '' },
  { title: 'Little Wing',           artist: 'Jimi Hendrix',    duration: 148, src: '' },
  { title: 'Riders on the Storm',   artist: 'The Doors',       duration: 427, src: '' },
  { title: 'Pale Blue Eyes',        artist: 'The Velvet Underground', duration: 301, src: '' },
  { title: 'Blue in Green',         artist: 'Miles Davis',     duration: 337, src: '' },
  { title: 'One of These Days',     artist: 'Pink Floyd',      duration: 356, src: '' },
];

function fmtTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Tape reel SVG — rotates when playing
function TapeReel({ angle, size = 60 }: { angle: number; size?: number }) {
  const cx = size / 2;
  const r = cx - 4;
  const innerR = r * 0.28;
  const spokeCount = 6;
  const spokes = Array.from({ length: spokeCount }, (_, i) => {
    const a = (i / spokeCount) * Math.PI * 2 + angle;
    return {
      x1: cx + Math.cos(a) * innerR,
      y1: cx + Math.sin(a) * innerR,
      x2: cx + Math.cos(a) * r * 0.72,
      y2: cx + Math.sin(a) * r * 0.72,
    };
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle cx={cx} cy={cx} r={r} stroke={CRT_FG} strokeWidth="1" fill="none" opacity="0.7" />
      <circle cx={cx} cy={cx} r={innerR} stroke={CRT_FG} strokeWidth="0.8" fill={CRT_BG} opacity="0.9" />
      {spokes.map((s, i) => (
        <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={CRT_FG} strokeWidth="0.8" opacity="0.6" />
      ))}
      <circle cx={cx} cy={cx} r={3} fill={CRT_FG} opacity="0.5" />
    </svg>
  );
}

// VU meter bar
function VUMeter({ level, label }: { level: number; label: string }) {
  const totalBars = 12;
  const activeBars = Math.round(level * totalBars);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
      <div style={{ display: 'flex', flexDirection: 'column-reverse', gap: 2 }}>
        {Array.from({ length: totalBars }, (_, i) => {
          const active = i < activeBars;
          const isHigh = i >= totalBars * 0.8;
          const isMid = i >= totalBars * 0.6;
          const color = active
            ? isHigh
              ? 'rgba(136,192,208,0.95)'
              : isMid
              ? 'rgba(136,192,208,0.7)'
              : 'rgba(136,192,208,0.45)'
            : 'rgba(136,192,208,0.07)';
          return (
            <div
              key={i}
              style={{
                width: 10,
                height: 3,
                background: color,
                transition: 'background 0.05s',
              }}
            />
          );
        })}
      </div>
      <span style={{ fontSize: 7, color: CRT_FG_GHOST, letterSpacing: '0.1em' }}>{label}</span>
    </div>
  );
}

export function MusicPlayerWindow() {
  const [trackIdx, setTrackIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);       // 0–1
  const [elapsed, setElapsed] = useState(0);          // seconds
  const [reelAngle, setReelAngle] = useState(0);
  const [vuL, setVuL] = useState(0);
  const [vuR, setVuR] = useState(0);
  const [blink, setBlink] = useState(true);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const playingRef = useRef(false);

  const track = PLAYLIST[trackIdx]!;

  // Blink cursor
  useEffect(() => {
    const id = window.setInterval(() => setBlink((b) => !b), 600);
    return () => window.clearInterval(id);
  }, []);

  // Animation loop — updates reel angle, VU meters, progress for visual-only mode
  useEffect(() => {
    const animate = (t: number) => {
      const dt = (t - lastTimeRef.current) / 1000;
      lastTimeRef.current = t;

      if (playingRef.current) {
        setReelAngle((a) => a + dt * 2.4);

        // Simulated VU levels with organic variation
        const base = 0.35 + Math.sin(t / 400) * 0.12;
        setVuL(Math.max(0, Math.min(1, base + (Math.random() - 0.5) * 0.3)));
        setVuR(Math.max(0, Math.min(1, base + (Math.random() - 0.5) * 0.3)));

        if (!audioRef.current?.src || audioRef.current.paused) {
          setElapsed((e) => {
            const next = e + dt;
            if (next >= track.duration) {
              setTrackIdx((i) => (i + 1) % PLAYLIST.length);
              return 0;
            }
            setProgress(next / track.duration);
            return next;
          });
        }
      } else {
        setVuL((v) => Math.max(0, v - dt * 2));
        setVuR((v) => Math.max(0, v - dt * 2));
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [track.duration]);

  const togglePlay = useCallback(() => {
    const next = !playing;
    setPlaying(next);
    playingRef.current = next;
    if (audioRef.current?.src) {
      next ? audioRef.current.play().catch(() => {}) : audioRef.current.pause();
    }
  }, [playing]);

  const stop = useCallback(() => {
    setPlaying(false);
    playingRef.current = false;
    setElapsed(0);
    setProgress(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, []);

  const prev = useCallback(() => {
    setTrackIdx((i) => (i - 1 + PLAYLIST.length) % PLAYLIST.length);
    setElapsed(0);
    setProgress(0);
  }, []);

  const next = useCallback(() => {
    setTrackIdx((i) => (i + 1) % PLAYLIST.length);
    setElapsed(0);
    setProgress(0);
  }, []);

  const seek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setProgress(ratio);
    setElapsed(ratio * track.duration);
    if (audioRef.current?.src) {
      audioRef.current.currentTime = ratio * track.duration;
    }
  }, [track.duration]);

  const CtrlBtn = ({ children, onClick, active }: { children: React.ReactNode; onClick: () => void; active?: boolean }) => (
    <button
      onClick={onClick}
      style={{
        fontFamily: 'IBM Plex Mono, monospace',
        fontSize: 11,
        color: active ? '#0e0e14' : CRT_FG,
        background: active ? CRT_FG : 'none',
        border: `1px solid ${active ? CRT_FG : 'rgba(136,192,208,0.4)'}`,
        padding: '4px 10px',
        cursor: 'pointer',
        letterSpacing: '0.05em',
        transition: 'background 0.1s, color 0.1s',
        minWidth: 34,
        textAlign: 'center',
      }}
      onMouseEnter={(e) => {
        if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(136,192,208,0.1)';
      }}
      onMouseLeave={(e) => {
        if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'none';
      }}
    >
      {children}
    </button>
  );

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: CRT_BG,
      color: CRT_FG,
      fontFamily: 'IBM Plex Mono, monospace',
      padding: '16px',
      gap: 14,
      boxSizing: 'border-box',
      overflow: 'hidden',
    }}>
      {/* Hidden audio element */}
      {track.src && (
        <audio
          ref={audioRef}
          src={track.src}
          onEnded={() => next()}
          onTimeUpdate={() => {
            if (audioRef.current) {
              setElapsed(audioRef.current.currentTime);
              setProgress(audioRef.current.currentTime / track.duration);
            }
          }}
        />
      )}

      {/* Header label */}
      <div style={{ fontSize: 8, letterSpacing: '0.25em', color: CRT_FG_GHOST, textTransform: 'uppercase' }}>
        WILLCO AUDIO — TAPE DECK MKII
      </div>

      {/* Tape reels + VU meters */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
        <TapeReel angle={reelAngle} size={64} />

        {/* VU meters in the middle */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', flex: 1, justifyContent: 'center' }}>
          <VUMeter level={vuL} label="L" />
          <VUMeter level={vuR} label="R" />
        </div>

        <TapeReel angle={-reelAngle * 0.85} size={64} />
      </div>

      {/* Now playing display */}
      <div style={{
        border: `1px solid rgba(136,192,208,0.2)`,
        padding: '10px 12px',
        background: 'rgba(136,192,208,0.03)',
      }}>
        <div style={{ fontSize: 8, letterSpacing: '0.2em', color: CRT_FG_GHOST, marginBottom: 6, textTransform: 'uppercase' }}>
          {playing ? `NOW PLAYING ${blink ? '▶' : ' '}` : 'PAUSED'}
        </div>
        <div style={{ fontSize: 13, letterSpacing: '0.06em', color: CRT_FG, lineHeight: 1.3, marginBottom: 3 }}>
          {track.title}
        </div>
        <div style={{ fontSize: 9, color: CRT_FG_DIM, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {track.artist}
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div
          onClick={seek}
          style={{
            height: 4,
            background: 'rgba(136,192,208,0.1)',
            border: `1px solid rgba(136,192,208,0.2)`,
            cursor: 'pointer',
            position: 'relative',
            marginBottom: 5,
          }}
        >
          <div style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: `${progress * 100}%`,
            background: 'rgba(136,192,208,0.5)',
            transition: 'width 0.1s linear',
          }} />
          {/* Playhead cursor */}
          <div style={{
            position: 'absolute',
            left: `${progress * 100}%`,
            top: -3,
            width: 2,
            height: 10,
            background: blink && playing ? CRT_FG : 'transparent',
            transform: 'translateX(-1px)',
            transition: 'background 0.3s',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: CRT_FG_GHOST, letterSpacing: '0.08em' }}>
          <span>{fmtTime(elapsed)}</span>
          <span>{fmtTime(track.duration)}</span>
        </div>
      </div>

      {/* Playback controls */}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
        <CtrlBtn onClick={prev}>◀◀</CtrlBtn>
        <CtrlBtn onClick={togglePlay} active={playing}>{playing ? '⏸' : '▶'}</CtrlBtn>
        <CtrlBtn onClick={stop}>■</CtrlBtn>
        <CtrlBtn onClick={next}>▶▶</CtrlBtn>
      </div>

      {/* Playlist */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        borderTop: `1px solid rgba(136,192,208,0.12)`,
        paddingTop: 8,
        minHeight: 0,
      }}>
        {PLAYLIST.map((t, i) => (
          <div
            key={i}
            onClick={() => { setTrackIdx(i); setElapsed(0); setProgress(0); }}
            style={{
              padding: '4px 6px',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: i === trackIdx ? 'rgba(136,192,208,0.08)' : 'none',
              borderLeft: i === trackIdx ? `2px solid ${CRT_FG}` : '2px solid transparent',
              marginBottom: 2,
              transition: 'background 0.1s',
            }}
            onMouseEnter={(e) => {
              if (i !== trackIdx) (e.currentTarget as HTMLDivElement).style.background = 'rgba(136,192,208,0.04)';
            }}
            onMouseLeave={(e) => {
              if (i !== trackIdx) (e.currentTarget as HTMLDivElement).style.background = 'none';
            }}
          >
            <div>
              <div style={{ fontSize: 9, color: i === trackIdx ? CRT_FG : CRT_FG_DIM, letterSpacing: '0.05em' }}>
                {t.title}
              </div>
              <div style={{ fontSize: 8, color: CRT_FG_GHOST, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {t.artist}
              </div>
            </div>
            <span style={{ fontSize: 8, color: CRT_FG_GHOST, letterSpacing: '0.05em', flexShrink: 0, marginLeft: 8 }}>
              {fmtTime(t.duration)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
