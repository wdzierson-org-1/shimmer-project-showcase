import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react';
import { WillCoTrafficLights } from './WillCoTrafficLights';

export interface WillCoWindowState {
  id: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  isMinimized: boolean;
  appId: string;
  meta?: Record<string, unknown>;
}

export interface WillCoWindowFrameProps {
  title: string;
  children: ReactNode;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  isMinimized?: boolean;
  isActive?: boolean;
  fixed?: boolean;
  onClose: () => void;
  onMinimize?: () => void;
  onFocus: () => void;
  onMove: (x: number, y: number) => void;
  onResize: (width: number, height: number) => void;
  minWidth?: number;
  minHeight?: number;
}

const TITLE_H = 28;
const CRT_BG = '#0e0e14';
const CRT_FG = '#88c0d0';
const CRT_BORDER = 'rgba(136,192,208,0.35)';
const CRT_TITLE_BG = '#111118';

export function WillCoWindowFrame({
  title,
  children,
  x,
  y,
  width,
  height,
  zIndex,
  isMinimized = false,
  isActive = true,
  fixed = false,
  onClose,
  onMinimize,
  onFocus,
  onMove,
  onResize,
  minWidth = 280,
  minHeight = 200,
}: WillCoWindowFrameProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const windowRef = useRef<HTMLDivElement>(null);

  const handleTitleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('button')) return;
      e.preventDefault();
      onFocus();
      setIsDragging(true);
      dragOffset.current = { x: e.clientX - x, y: e.clientY - y };
    },
    [onFocus, x, y],
  );

  useEffect(() => {
    if (!isDragging) return;
    const onMove_ = (e: MouseEvent) => {
      onMove(e.clientX - dragOffset.current.x, e.clientY - dragOffset.current.y);
    };
    const onUp = () => setIsDragging(false);
    document.addEventListener('mousemove', onMove_);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove_);
      document.removeEventListener('mouseup', onUp);
    };
  }, [isDragging, onMove]);

  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onFocus();
      setIsResizing(true);
      resizeStart.current = { x: e.clientX, y: e.clientY, w: width, h: height };
    },
    [onFocus, width, height],
  );

  useEffect(() => {
    if (!isResizing) return;
    const onMove_ = (e: MouseEvent) => {
      const dx = e.clientX - resizeStart.current.x;
      const dy = e.clientY - resizeStart.current.y;
      onResize(
        Math.max(minWidth, resizeStart.current.w + dx),
        Math.max(minHeight, resizeStart.current.h + dy),
      );
    };
    const onUp = () => setIsResizing(false);
    document.addEventListener('mousemove', onMove_);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove_);
      document.removeEventListener('mouseup', onUp);
    };
  }, [isResizing, onResize, minWidth, minHeight]);

  if (isMinimized) return null;

  return (
    <div
      ref={windowRef}
      role="dialog"
      aria-label={title}
      onMouseDown={() => onFocus()}
      style={{
        position: fixed ? 'fixed' : 'absolute',
        left: x,
        top: y,
        width,
        height,
        zIndex,
        display: 'flex',
        flexDirection: 'column',
        background: CRT_BG,
        border: `1px solid ${isActive ? CRT_FG : CRT_BORDER}`,
        boxShadow: isActive
          ? `0 0 0 1px ${CRT_BORDER}, 0 8px 32px rgba(0,0,0,0.8), inset 0 0 40px rgba(136,192,208,0.02)`
          : `0 2px 12px rgba(0,0,0,0.6)`,
        fontFamily: 'IBM Plex Mono, monospace',
        userSelect: isDragging || isResizing ? 'none' : undefined,
      }}
    >
      {/* Title bar */}
      <div
        className="window-title-bar"
        onMouseDown={handleTitleMouseDown}
        style={{
          height: TITLE_H,
          minHeight: TITLE_H,
          background: CRT_TITLE_BG,
          borderBottom: `1px solid ${CRT_BORDER}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 8px',
          cursor: isDragging ? 'grabbing' : 'grab',
          flexShrink: 0,
        }}
      >
        <WillCoTrafficLights onClose={onClose} onMinimize={onMinimize} isActive={isActive} />
        <span
          style={{
            flex: 1,
            textAlign: 'center',
            fontSize: 10,
            letterSpacing: '0.15em',
            color: isActive ? CRT_FG : 'rgba(136,192,208,0.4)',
            textTransform: 'uppercase',
            pointerEvents: 'none',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            padding: '0 8px',
          }}
        >
          {title}
        </span>
        {/* Spacer to keep title centered */}
        <div style={{ width: 40, flexShrink: 0 }} />
      </div>

      {/* Content area */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          position: 'relative',
          background: CRT_BG,
          color: CRT_FG,
        }}
      >
        {children}
      </div>

      {/* Resize handle */}
      <div
        onMouseDown={handleResizeMouseDown}
        style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: 14,
          height: 14,
          cursor: 'se-resize',
          opacity: 0.5,
        }}
        aria-hidden="true"
      >
        <svg width="14" height="14" viewBox="0 0 14 14">
          <line x1="3" y1="13" x2="13" y2="3" stroke={CRT_FG} strokeWidth="1" opacity="0.4" />
          <line x1="7" y1="13" x2="13" y2="7" stroke={CRT_FG} strokeWidth="1" opacity="0.6" />
          <line x1="11" y1="13" x2="13" y2="11" stroke={CRT_FG} strokeWidth="1" opacity="0.8" />
        </svg>
      </div>
    </div>
  );
}
