import { useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useWillCoState } from '@/hooks/useWillCoState';
import { WillCoWindowFrame } from './window/WillCoWindowFrame';
import { ProjectBrowserWindow } from './ProjectBrowserWindow';
import { ProjectDetailWindow } from './ProjectDetailWindow';
import { PortfolioTimelineWindow } from './PortfolioTimelineWindow';
import { MusicPlayerWindow } from './MusicPlayerWindow';

const CRT_FG = '#88c0d0';
const CRT_FG_DIM = 'rgba(136,192,208,0.35)';
const CRT_BG = '#101014';
const BROWSER_ID = 'project-browser';

// The two intersecting circles logo from Lumon-style reference
const WillCoLogo = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="7" cy="10" r="6" stroke={CRT_FG} strokeWidth="1" fill="none" />
    <circle cx="13" cy="10" r="6" stroke={CRT_FG} strokeWidth="1" fill="none" />
  </svg>
);

// Folder icon for the desktop Projects shortcut
const ProjectsDesktopIcon = () => (
  <svg width="38" height="32" viewBox="0 0 44 38" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M2 8 L2 36 L42 36 L42 12 L20 12 L16 8 Z" stroke={CRT_FG} strokeWidth="1.2" fill="rgba(136,192,208,0.04)" />
    <path d="M2 12 L42 12" stroke={CRT_FG} strokeWidth="0.6" opacity="0.4" />
    <rect x="15" y="19" width="14" height="10" stroke={CRT_FG} strokeWidth="0.8" fill="none" opacity="0.6" />
    <line x1="15" y1="22" x2="29" y2="22" stroke={CRT_FG} strokeWidth="0.5" opacity="0.4" />
    <line x1="15" y1="25" x2="29" y2="25" stroke={CRT_FG} strokeWidth="0.5" opacity="0.4" />
  </svg>
);

// Timeline icon — horizontal bars of varying widths
const TimelineDesktopIcon = () => (
  <svg width="38" height="32" viewBox="0 0 44 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <line x1="2" y1="6" x2="42" y2="6" stroke={CRT_FG} strokeWidth="0.5" opacity="0.3" />
    <rect x="2" y="10" width="28" height="4" stroke={CRT_FG} strokeWidth="1" fill="rgba(136,192,208,0.08)" />
    <rect x="10" y="18" width="20" height="4" stroke={CRT_FG} strokeWidth="1" fill="rgba(136,192,208,0.08)" />
    <rect x="6" y="26" width="32" height="4" stroke={CRT_FG} strokeWidth="1" fill="rgba(136,192,208,0.08)" />
    <line x1="2" y1="34" x2="42" y2="34" stroke={CRT_FG} strokeWidth="0.5" opacity="0.3" />
  </svg>
);

// Music / tape reel icon
const MusicDesktopIcon = () => (
  <svg width="38" height="32" viewBox="0 0 44 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect x="2" y="4" width="40" height="28" rx="1" stroke={CRT_FG} strokeWidth="1" fill="none" />
    <circle cx="13" cy="18" r="6" stroke={CRT_FG} strokeWidth="0.8" fill="none" />
    <circle cx="13" cy="18" r="2" stroke={CRT_FG} strokeWidth="0.6" fill="rgba(136,192,208,0.15)" />
    <circle cx="31" cy="18" r="6" stroke={CRT_FG} strokeWidth="0.8" fill="none" />
    <circle cx="31" cy="18" r="2" stroke={CRT_FG} strokeWidth="0.6" fill="rgba(136,192,208,0.15)" />
    <line x1="13" y1="12" x2="31" y2="12" stroke={CRT_FG} strokeWidth="0.6" opacity="0.4" />
    <line x1="19" y1="18" x2="25" y2="18" stroke={CRT_FG} strokeWidth="0.5" opacity="0.5" />
  </svg>
);

// Reusable desktop icon button
interface DesktopIconBtnProps {
  onClick: () => void;
  label: string;
  aria: string;
  children: React.ReactNode;
}

function DesktopIconBtn({ onClick, label, aria, children }: DesktopIconBtnProps) {
  return (
    <button
      onClick={onClick}
      aria-label={aria}
      style={{
        background: 'none',
        border: '1px solid transparent',
        cursor: 'pointer',
        padding: '6px 8px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        transition: 'border-color 0.15s, background 0.15s',
        width: 64,
      }}
      onMouseEnter={(e) => {
        const btn = e.currentTarget as HTMLButtonElement;
        btn.style.borderColor = 'rgba(136,192,208,0.35)';
        btn.style.background = 'rgba(136,192,208,0.05)';
      }}
      onMouseLeave={(e) => {
        const btn = e.currentTarget as HTMLButtonElement;
        btn.style.borderColor = 'transparent';
        btn.style.background = 'none';
      }}
    >
      {children}
      <span style={{
        fontSize: 8,
        color: CRT_FG,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        textAlign: 'center',
        lineHeight: 1.2,
      }}>
        {label}
      </span>
    </button>
  );
}

interface Project {
  id: string;
  title: string;
  client: string;
  year: number | null;
  description: string;
}

// Viewport-level base positions so portalled windows appear in screen center area
const VP_BASE_X = Math.max(40, window.innerWidth * 0.12);
const VP_BASE_Y = Math.max(80, window.innerHeight * 0.15);

export function WillCoDesktop() {
  const { windows, openWindow, closeWindow, focusWindow, minimizeWindow, moveWindow, resizeWindow, nextPosition } =
    useWillCoState();
  const containerRef = useRef<HTMLDivElement>(null);

  const openProjectBrowser = useCallback(() => {
    const pos = nextPosition(VP_BASE_X, VP_BASE_Y);
    openWindow({
      id: BROWSER_ID,
      appId: 'project-browser',
      title: 'PROJECTS — WILLCO SYSTEMS',
      x: pos.x,
      y: pos.y,
      width: 520,
      height: 400,
      zIndex: 1100,
      isMinimized: false,
    });
  }, [openWindow, nextPosition]);

  const openProjectDetail = useCallback(
    (project: Project) => {
      const id = `project-detail-${project.id}`;
      const pos = nextPosition(VP_BASE_X + 60, VP_BASE_Y + 40);
      openWindow({
        id,
        appId: 'project-detail',
        title: project.title.toUpperCase(),
        x: pos.x,
        y: pos.y,
        width: 400,
        height: 440,
        zIndex: 1101,
        isMinimized: false,
        meta: { projectId: project.id },
      });
    },
    [openWindow, nextPosition],
  );

  const openTimeline = useCallback(() => {
    const pos = nextPosition(VP_BASE_X, VP_BASE_Y);
    openWindow({
      id: 'portfolio-timeline',
      appId: 'portfolio-timeline',
      title: 'PORTFOLIO TIMELINE — WILLCO SYSTEMS',
      x: pos.x,
      y: pos.y,
      width: Math.min(900, window.innerWidth - 80),
      height: 480,
      zIndex: 1100,
      isMinimized: false,
    });
  }, [openWindow, nextPosition]);

  const openMusicPlayer = useCallback(() => {
    const pos = nextPosition(VP_BASE_X + 40, VP_BASE_Y + 60);
    openWindow({
      id: 'music-player',
      appId: 'music-player',
      title: 'WILLCO AUDIO — TAPE DECK',
      x: pos.x,
      y: pos.y,
      width: 360,
      height: 420,
      zIndex: 1100,
      isMinimized: false,
    });
  }, [openWindow, nextPosition]);

  const activeZ = windows.reduce((m, w) => Math.max(m, w.zIndex), 0);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: CRT_BG,
        overflow: 'hidden',
        fontFamily: 'IBM Plex Mono, monospace',
      }}
    >
      {/* Desktop wallpaper */}
      <img
        aria-hidden="true"
        src="/willco-desktop-bg.png"
        alt=""
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '55%',
          height: 'auto',
          opacity: 0.55,
          zIndex: 0,
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      />

      {/* Subtle scanline overlay */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)',
          pointerEvents: 'none',
          zIndex: 9999,
        }}
      />

      {/* WillCo header bar */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 28,
        borderBottom: `1px solid rgba(136,192,208,0.2)`,
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        gap: 8,
        zIndex: 10,
        background: 'rgba(16,16,20,0.82)',
        backdropFilter: 'blur(4px)',
      }}>
        <WillCoLogo />
        <span style={{ fontSize: 10, letterSpacing: '0.25em', color: CRT_FG, textTransform: 'uppercase' }}>
          WillCo
        </span>
        <span style={{ fontSize: 9, letterSpacing: '0.15em', color: CRT_FG_DIM, marginLeft: 4 }}>
          Systems v2.1
        </span>
      </div>

      {/* Desktop surface (below header) */}
      <div style={{ position: 'absolute', top: 28, left: 0, right: 0, bottom: 0, zIndex: 1 }}>
        {/* Icon column — upper right */}
        <div style={{
          position: 'absolute',
          top: 12,
          right: 12,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
        }}>
          <DesktopIconBtn onClick={openProjectBrowser} label="Projects" aria="Open Projects">
            <ProjectsDesktopIcon />
          </DesktopIconBtn>
          <DesktopIconBtn onClick={openTimeline} label="Timeline" aria="Open Timeline">
            <TimelineDesktopIcon />
          </DesktopIconBtn>
          <DesktopIconBtn onClick={openMusicPlayer} label="Music" aria="Open Music Player">
            <MusicDesktopIcon />
          </DesktopIconBtn>
        </div>

        {/* Status hint when no windows open */}
        {windows.length === 0 && (
          <div style={{
            position: 'absolute',
            bottom: 16,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontSize: 9,
            color: 'rgba(136,192,208,0.15)',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            pointerEvents: 'none',
          }}>
            Click an icon to open
          </div>
        )}
      </div>

      {/* Portalled windows — render into document.body, above all page stacking contexts */}
      {createPortal(
        <>
          {windows.map((win) => (
            <WillCoWindowFrame
              key={win.id}
              title={win.title}
              x={win.x}
              y={win.y}
              width={win.width}
              height={win.height}
              zIndex={win.zIndex}
              isMinimized={win.isMinimized}
              isActive={win.zIndex === activeZ}
              fixed
              onClose={() => closeWindow(win.id)}
              onMinimize={() => minimizeWindow(win.id)}
              onFocus={() => focusWindow(win.id)}
              onMove={(x, y) => moveWindow(win.id, x, y)}
              onResize={(width, height) => resizeWindow(win.id, width, height)}
            >
              {win.appId === 'project-browser' && (
                <ProjectBrowserWindow onOpenProject={(project) => openProjectDetail(project)} />
              )}
              {win.appId === 'project-detail' && win.meta?.projectId && (
                <ProjectDetailWindow projectId={win.meta.projectId as string} />
              )}
              {win.appId === 'portfolio-timeline' && (
                <PortfolioTimelineWindow onOpenProject={(project) => openProjectDetail(project)} />
              )}
              {win.appId === 'music-player' && (
                <MusicPlayerWindow />
              )}
            </WillCoWindowFrame>
          ))}
        </>,
        document.body,
      )}
    </div>
  );
}
