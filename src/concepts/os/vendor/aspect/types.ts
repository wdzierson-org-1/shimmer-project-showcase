export type WindowPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'cascade';

export interface WindowState {
  id: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  isMinimized: boolean;
  isMaximized: boolean;
  isFocused: boolean;
  isVisible: boolean;
  isModal: boolean;
  appId: string;
  metadata?: Record<string, unknown>;
}

export interface WindowConfig {
  title: string;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  minWidth?: number;
  minHeight?: number;
}

export interface AppManifest {
  id: string;
  name: string;
  icon?: string | unknown;
  defaultTitle: string;
  defaultWidth: number;
  defaultHeight: number;
  windowless?: boolean;
  preferredPosition?: WindowPosition;
  fileAssociations?: string[];
  hidden?: boolean;
}

export interface AppContext {
  windowId: string;
  windowState: WindowState;
  options?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface OSConfig {
  menuBarHeight?: number;
  minWindowWidth?: number;
  minWindowHeight?: number;
  windowMargin?: number;
  cascadeOffset?: number;
  maxCascadeWindows?: number;
}

export interface ScreenBounds {
  width: number;
  height: number;
  availableWidth: number;
  availableHeight: number;
  menuBarHeight: number;
  minMargin: number;
}

export interface Coordinates {
  x: number;
  y: number;
}

export interface Dimensions {
  width: number;
  height: number;
}

export interface OSEvent {
  type: string;
  data?: any;
  timestamp: number;
  source?: string;
}

export type EventCallback = (event: OSEvent) => void;

export interface FocusState {
  activeWindowId: string | null;
  previousWindowId: string | null;
}
