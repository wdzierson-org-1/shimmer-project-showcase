import { useReducer, useEffect, useCallback } from 'react';
import type { WillCoWindowState } from '@/components/willco/window/WillCoWindowFrame';

const STORAGE_KEY = 'willcoState';
const STATE_VERSION = 2;
const CASCADE_OFFSET = 24;

type ClosedPosition = { x: number; y: number; width: number; height: number };

interface PersistedState {
  windows: WillCoWindowState[];
  closedPositions: Record<string, ClosedPosition>;
  version: number;
}

interface State {
  windows: WillCoWindowState[];
  closedPositions: Record<string, ClosedPosition>;
}

type Action =
  | { type: 'OPEN'; window: WillCoWindowState }
  | { type: 'CLOSE'; id: string }
  | { type: 'FOCUS'; id: string }
  | { type: 'MINIMIZE'; id: string }
  | { type: 'MOVE'; id: string; x: number; y: number }
  | { type: 'RESIZE'; id: string; width: number; height: number }
  | { type: 'HYDRATE'; state: State };

// Base z-index above Tailwind z-50 (50) and any other page stacking contexts.
// Windows render via a portal into document.body so they float above everything.
const BASE_Z = 1100;

function maxZ(windows: WillCoWindowState[]): number {
  return windows.reduce((m, w) => Math.max(m, w.zIndex), BASE_Z);
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'HYDRATE':
      return action.state;

    case 'OPEN': {
      const existing = state.windows.find((w) => w.id === action.window.id);
      if (existing) {
        // Window already open — just focus and unminimize it.
        return {
          ...state,
          windows: state.windows.map((w) =>
            w.id === action.window.id
              ? { ...w, isMinimized: false, zIndex: maxZ(state.windows) + 1 }
              : w,
          ),
        };
      }
      // Restore last known position/size if available, otherwise use what was passed in.
      const prior = state.closedPositions[action.window.id];
      const windowToOpen = prior
        ? { ...action.window, x: prior.x, y: prior.y, width: prior.width, height: prior.height }
        : action.window;
      return {
        ...state,
        windows: [...state.windows, { ...windowToOpen, zIndex: maxZ(state.windows) + 1 }],
      };
    }

    case 'CLOSE': {
      const closing = state.windows.find((w) => w.id === action.id);
      return {
        windows: state.windows.filter((w) => w.id !== action.id),
        closedPositions: closing
          ? {
              ...state.closedPositions,
              [action.id]: { x: closing.x, y: closing.y, width: closing.width, height: closing.height },
            }
          : state.closedPositions,
      };
    }

    case 'FOCUS':
      return {
        ...state,
        windows: state.windows.map((w) =>
          w.id === action.id ? { ...w, zIndex: maxZ(state.windows) + 1 } : w,
        ),
      };

    case 'MINIMIZE':
      return {
        ...state,
        windows: state.windows.map((w) =>
          w.id === action.id ? { ...w, isMinimized: !w.isMinimized } : w,
        ),
      };

    case 'MOVE':
      return {
        ...state,
        windows: state.windows.map((w) =>
          w.id === action.id ? { ...w, x: action.x, y: action.y } : w,
        ),
      };

    case 'RESIZE':
      return {
        ...state,
        windows: state.windows.map((w) =>
          w.id === action.id ? { ...w, width: action.width, height: action.height } : w,
        ),
      };

    default:
      return state;
  }
}

/** Min px of a window that must remain visible inside the viewport on load. */
const VIEWPORT_MARGIN = 40;

function clampWindow(w: WillCoWindowState): WillCoWindowState {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  return {
    ...w,
    x: Math.min(Math.max(w.x, -(w.width - VIEWPORT_MARGIN)), vw - VIEWPORT_MARGIN),
    y: Math.min(Math.max(w.y, 0), vh - VIEWPORT_MARGIN),
  };
}

function clampPosition(pos: ClosedPosition): ClosedPosition {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  return {
    ...pos,
    x: Math.min(Math.max(pos.x, -(pos.width - VIEWPORT_MARGIN)), vw - VIEWPORT_MARGIN),
    y: Math.min(Math.max(pos.y, 0), vh - VIEWPORT_MARGIN),
  };
}

function loadFromStorage(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { windows: [], closedPositions: {} };
    const parsed: PersistedState = JSON.parse(raw);
    if (parsed.version !== STATE_VERSION) return { windows: [], closedPositions: {} };
    const windows = (parsed.windows ?? [])
      .filter((w) => w.id && w.appId && typeof w.x === 'number' && typeof w.y === 'number')
      .map(clampWindow);
    const closedPositions: Record<string, ClosedPosition> = {};
    for (const [id, pos] of Object.entries(parsed.closedPositions ?? {})) {
      closedPositions[id] = clampPosition(pos as ClosedPosition);
    }
    return { windows, closedPositions };
  } catch {
    return { windows: [], closedPositions: {} };
  }
}

function saveToStorage(state: State) {
  try {
    const data: PersistedState = {
      windows: state.windows,
      closedPositions: state.closedPositions,
      version: STATE_VERSION,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /* ignore quota errors */ }
}

export function useWillCoState() {
  const [state, dispatch] = useReducer(reducer, undefined, loadFromStorage);
  const { windows, closedPositions } = state;

  // Persist on every state change
  useEffect(() => {
    saveToStorage(state);
  }, [state]);

  const openWindow = useCallback((window: WillCoWindowState) => {
    dispatch({ type: 'OPEN', window });
  }, []);

  const closeWindow = useCallback((id: string) => {
    dispatch({ type: 'CLOSE', id });
  }, []);

  const focusWindow = useCallback((id: string) => {
    dispatch({ type: 'FOCUS', id });
  }, []);

  const minimizeWindow = useCallback((id: string) => {
    dispatch({ type: 'MINIMIZE', id });
  }, []);

  const moveWindow = useCallback((id: string, x: number, y: number) => {
    dispatch({ type: 'MOVE', id, x, y });
  }, []);

  const resizeWindow = useCallback((id: string, width: number, height: number) => {
    dispatch({ type: 'RESIZE', id, width, height });
  }, []);

  /** Generate a cascaded default position for new windows */
  const nextPosition = useCallback(
    (baseX = 20, baseY = 20): { x: number; y: number } => {
      const count = windows.length;
      return {
        x: baseX + (count % 6) * CASCADE_OFFSET,
        y: baseY + (count % 6) * CASCADE_OFFSET,
      };
    },
    [windows.length],
  );

  /** Return the last known position/size for a window id, if it was previously closed. */
  const lastPosition = useCallback(
    (id: string): ClosedPosition | undefined => closedPositions[id],
    [closedPositions],
  );

  return {
    windows,
    openWindow,
    closeWindow,
    focusWindow,
    minimizeWindow,
    moveWindow,
    resizeWindow,
    nextPosition,
    lastPosition,
  };
}
