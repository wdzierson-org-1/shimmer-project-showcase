import { useReducer, useEffect, useCallback } from 'react';
import type { WillCoWindowState } from '@/components/willco/window/WillCoWindowFrame';

const STORAGE_KEY = 'willcoState';
const STATE_VERSION = 1;
const CASCADE_OFFSET = 24;

interface PersistedState {
  windows: WillCoWindowState[];
  version: number;
}

type Action =
  | { type: 'OPEN'; window: WillCoWindowState }
  | { type: 'CLOSE'; id: string }
  | { type: 'FOCUS'; id: string }
  | { type: 'MINIMIZE'; id: string }
  | { type: 'MOVE'; id: string; x: number; y: number }
  | { type: 'RESIZE'; id: string; width: number; height: number }
  | { type: 'HYDRATE'; windows: WillCoWindowState[] };

// Base z-index above Tailwind z-50 (50) and any other page stacking contexts.
// Windows render via a portal into document.body so they float above everything.
const BASE_Z = 1100;

function maxZ(windows: WillCoWindowState[]): number {
  return windows.reduce((m, w) => Math.max(m, w.zIndex), BASE_Z);
}

function reducer(state: WillCoWindowState[], action: Action): WillCoWindowState[] {
  switch (action.type) {
    case 'HYDRATE':
      return action.windows;

    case 'OPEN': {
      // If a window with the same id already exists, just focus it
      if (state.some((w) => w.id === action.window.id)) {
        return state.map((w) =>
          w.id === action.window.id
            ? { ...w, isMinimized: false, zIndex: maxZ(state) + 1 }
            : w,
        );
      }
      return [...state, { ...action.window, zIndex: maxZ(state) + 1 }];
    }

    case 'CLOSE':
      return state.filter((w) => w.id !== action.id);

    case 'FOCUS':
      return state.map((w) =>
        w.id === action.id ? { ...w, zIndex: maxZ(state) + 1 } : w,
      );

    case 'MINIMIZE':
      return state.map((w) =>
        w.id === action.id ? { ...w, isMinimized: !w.isMinimized } : w,
      );

    case 'MOVE':
      return state.map((w) =>
        w.id === action.id ? { ...w, x: action.x, y: action.y } : w,
      );

    case 'RESIZE':
      return state.map((w) =>
        w.id === action.id ? { ...w, width: action.width, height: action.height } : w,
      );

    default:
      return state;
  }
}

function loadFromStorage(): WillCoWindowState[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: PersistedState = JSON.parse(raw);
    if (parsed.version !== STATE_VERSION) return [];
    return parsed.windows.filter(
      (w) => w.id && w.appId && typeof w.x === 'number' && typeof w.y === 'number',
    );
  } catch {
    return [];
  }
}

function saveToStorage(windows: WillCoWindowState[]) {
  try {
    const data: PersistedState = { windows, version: STATE_VERSION };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /* ignore quota errors */ }
}

export function useWillCoState() {
  const [windows, dispatch] = useReducer(reducer, [], loadFromStorage);

  // Persist on every state change
  useEffect(() => {
    saveToStorage(windows);
  }, [windows]);

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

  return {
    windows,
    openWindow,
    closeWindow,
    focusWindow,
    minimizeWindow,
    moveWindow,
    resizeWindow,
    nextPosition,
  };
}
