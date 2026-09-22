import { createWindowManager } from './vendor/aspect/WindowManager';
import { createScreenBounds } from './vendor/aspect/ScreenBounds';
export type AppId = 'welcome' | 'finder' | 'browser' | 'notes' | 'music' | 'videos' | 'terminal' | 'assistant' | 'contact';
export const apps: { id: AppId; name: string; width: number; height: number; color: string }[] = [
  { id: 'finder', name: 'My drive', width: 680, height: 440, color: 'blue' },
  { id: 'browser', name: 'Portfolio', width: 840, height: 590, color: 'teal' },
  { id: 'notes', name: 'Field notes', width: 680, height: 490, color: 'yellow' },
  { id: 'music', name: 'Listening room', width: 320, height: 360, color: 'orange' },
  { id: 'videos', name: 'Screening room', width: 640, height: 440, color: 'purple' },
  { id: 'terminal', name: 'Terminal', width: 720, height: 480, color: 'dark' },
  { id: 'assistant', name: 'Willbot', width: 580, height: 530, color: 'green' },
  { id: 'contact', name: 'Say hello', width: 420, height: 440, color: 'sky' },
  { id: 'welcome', name: 'Start here.txt', width: 295, height: 345, color: 'paper' },
];
export const bounds = createScreenBounds({ menuBarHeight: 42, windowMargin: 12 });
export const manager = createWindowManager(bounds);
export function launch(id: AppId) {
  const existing = manager.getWindow(id);
  if (existing) { if (existing.isMinimized) manager.restoreWindow(id); else manager.focusWindow(id); return; }
  const app = apps.find(a => a.id === id)!;
  const n = manager.getAllWindows().length;
  const safe = bounds.getSafeDimensions(app.width, Math.min(app.height, innerHeight - 172));
  let x = 220 + n * 24, y = 135 + n * 22;
  if (id === 'welcome') { x = 28; y = 142; }
  if (id === 'browser') { x = (innerWidth - safe.width) / 2; y = Math.max(72, (innerHeight - safe.height - 70) / 2); }
  if (id === 'music') { x = innerWidth - 365; y = Math.max(300, innerHeight - 460); }
  manager.createWindow({ id, appId: id, title: app.name, ...safe, x, y, zIndex: 100, isMinimized: false, isMaximized: false, isFocused: false, isVisible: true, isModal: false });
  manager.focusWindow(id);
}
export const folders: { name: string; app: AppId; caption: string }[] = [
  { name: 'Selected work', app: 'browser', caption: 'Projects & experiments' },
  { name: 'Writing', app: 'notes', caption: 'Notes from the practice' },
  { name: 'Music', app: 'music', caption: 'A little listening room' },
  { name: 'Videos', app: 'videos', caption: 'Things worth watching' },
  { name: 'About Will', app: 'welcome', caption: 'A short introduction' },
  { name: 'Get in touch', app: 'contact', caption: 'Start a conversation' },
];
