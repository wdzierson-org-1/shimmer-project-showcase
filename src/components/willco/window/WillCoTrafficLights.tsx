interface WillCoTrafficLightsProps {
  onClose: () => void;
  onMinimize?: () => void;
  isActive?: boolean;
  isMinimized?: boolean;
}

export function WillCoTrafficLights({ onClose, onMinimize, isActive = true, isMinimized = false }: WillCoTrafficLightsProps) {
  const dim = !isActive ? 'opacity-40' : '';
  return (
    <div role="group" aria-label="Window controls" className={`flex items-center gap-1 ${dim}`}>
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        aria-label="Close"
        style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: 11,
          color: '#88c0d0',
          background: 'none',
          border: '1px solid #88c0d0',
          padding: '0 4px',
          lineHeight: '16px',
          cursor: 'pointer',
          letterSpacing: 0,
        }}
      >
        ×
      </button>
      {onMinimize && (
        <button
          onClick={(e) => { e.stopPropagation(); onMinimize(); }}
          aria-label={isMinimized ? 'Expand' : 'Minimize'}
          style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 11,
            color: '#88c0d0',
            background: 'none',
            border: '1px solid #88c0d0',
            padding: '0 4px',
            lineHeight: '16px',
            cursor: 'pointer',
          }}
        >
          {isMinimized ? '□' : '_'}
        </button>
      )}
    </div>
  );
}
