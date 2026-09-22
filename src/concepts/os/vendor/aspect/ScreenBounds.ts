import type { ScreenBounds, Coordinates, Dimensions, OSConfig } from './types';

const DEFAULTS = {
  menuBarHeight: 28,
  minMargin: 20,
  cascadeOffset: 30,
  maxCascadeWindows: 10,
};

export class ScreenBoundsManager {
  private listeners = new Set<(bounds: ScreenBounds) => void>();
  private currentBounds: ScreenBounds;
  private nextCascade = 0;
  private config: Required<Pick<OSConfig, 'menuBarHeight' | 'windowMargin' | 'cascadeOffset' | 'maxCascadeWindows'>>;

  constructor(config?: OSConfig) {
    this.config = {
      menuBarHeight: config?.menuBarHeight ?? DEFAULTS.menuBarHeight,
      windowMargin: config?.windowMargin ?? DEFAULTS.minMargin,
      cascadeOffset: config?.cascadeOffset ?? DEFAULTS.cascadeOffset,
      maxCascadeWindows: config?.maxCascadeWindows ?? DEFAULTS.maxCascadeWindows,
    };
    this.currentBounds = this.calculate();
    if (typeof window !== 'undefined') {
      let timer: ReturnType<typeof setTimeout>;
      window.addEventListener('resize', () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          const next = this.calculate();
          if (next.width !== this.currentBounds.width || next.height !== this.currentBounds.height) {
            this.currentBounds = next;
            this.listeners.forEach((cb) => cb(this.currentBounds));
          }
        }, 100);
      });
    }
  }

  private calculate(): ScreenBounds {
    const w = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const h = typeof window !== 'undefined' ? window.innerHeight : 1080;
    const m = this.config.windowMargin;
    const mb = this.config.menuBarHeight;
    return {
      width: w,
      height: h,
      availableWidth: Math.max(100, w - m * 2),
      availableHeight: Math.max(100, h - mb - m * 2),
      menuBarHeight: mb,
      minMargin: m,
    };
  }

  getBounds(): ScreenBounds {
    return { ...this.currentBounds };
  }

  getSafeWindowPosition(width: number, height: number, preferred?: Partial<Coordinates>): Coordinates {
    const b = this.currentBounds;
    const minX = b.minMargin;
    const minY = b.menuBarHeight + b.minMargin;
    const maxX = b.width - width - b.minMargin;
    const maxY = b.height - height - b.minMargin;

    if (preferred?.x !== undefined && preferred?.y !== undefined) {
      return {
        x: Math.max(minX, Math.min(maxX, preferred.x)),
        y: Math.max(minY, Math.min(maxY, preferred.y)),
      };
    }

    const offset = this.nextCascade * this.config.cascadeOffset;
    let x = minX + offset;
    let y = minY + offset;
    if (x > maxX || y > maxY) {
      x = minX;
      y = minY;
      this.nextCascade = 0;
    }
    this.nextCascade = (this.nextCascade + 1) % this.config.maxCascadeWindows;
    return { x, y };
  }

  getSafeCornerPosition(width: number, height: number, corner: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'): Coordinates {
    const b = this.currentBounds;
    const m = b.minMargin;
    const sw = Math.min(width, b.width - m * 2);
    const sh = Math.min(height, b.height - b.menuBarHeight - m * 2);

    const positions: Record<string, Coordinates> = {
      'top-left': { x: m, y: b.menuBarHeight + m },
      'top-right': { x: Math.max(m, b.width - sw - m), y: b.menuBarHeight + m },
      'bottom-left': { x: m, y: Math.max(b.menuBarHeight + m, b.height - sh - m) },
      'bottom-right': { x: Math.max(m, b.width - sw - m), y: Math.max(b.menuBarHeight + m, b.height - sh - m) },
    };

    return this.constrainPosition(positions[corner].x, positions[corner].y, sw, sh);
  }

  constrainPosition(x: number, y: number, width: number, height: number): Coordinates {
    const b = this.currentBounds;
    return {
      x: Math.max(b.minMargin, Math.min(b.width - width - b.minMargin, x)),
      y: Math.max(b.menuBarHeight + b.minMargin, Math.min(b.height - height - b.minMargin, y)),
    };
  }

  getSafeDimensions(preferredWidth: number, preferredHeight: number): Dimensions {
    const b = this.currentBounds;
    return {
      width: Math.min(preferredWidth, b.availableWidth),
      height: Math.min(preferredHeight, b.availableHeight),
    };
  }

  isWindowOffScreen(x: number, y: number, width: number, height: number): boolean {
    const b = this.currentBounds;
    return x < 0 || y < b.menuBarHeight || x + width > b.width || y + height > b.height;
  }

  subscribe(callback: (bounds: ScreenBounds) => void): () => void {
    this.listeners.add(callback);
    return () => { this.listeners.delete(callback); };
  }

  resetCascade(): void {
    this.nextCascade = 0;
  }
}

export function createScreenBounds(config?: OSConfig): ScreenBoundsManager {
  return new ScreenBoundsManager(config);
}

export const screenBounds = createScreenBounds();
