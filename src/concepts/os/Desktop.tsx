import { lazy, Suspense, useEffect, useState, type PointerEvent, type ReactNode } from 'react';
import { Folder, Globe2, FileText, Music2, Film, Terminal, Sparkles, Send, HardDrive, Command, Search, X, Minus, Maximize2, ChevronDown, Grid2X2 } from 'lucide-react';
import { apps, bounds, launch, manager, type AppId } from './model';
import type { WindowState } from './vendor/aspect/types';
import { Finder, Portfolio, Notes, MusicPlayer, Videos, Assistant, Contact, Welcome } from './apps';
const CRTApp = lazy(() => import('./Terminal'));
const icons = { finder: Folder, browser: Globe2, notes: FileText, music: Music2, videos: Film, terminal: Terminal, assistant: Sparkles, contact: Send, welcome: FileText };
export function AppIcon({ id, small = false }: { id: AppId; small?: boolean }) { const Icon = icons[id]; return <span className={`app-icon ${apps.find(a => a.id === id)?.color} ${small ? 'small' : ''}`}><Icon size={small ? 18 : 29} strokeWidth={1.5}/></span>; }
function Frame({ win, children }: { win: WindowState; children: ReactNode }) {
  const [gesture, setGesture] = useState<{ x: number; y: number; wx: number; wy: number; w: number; h: number; resize: boolean } | null>(null);
  const start = (e: PointerEvent, resize = false) => { if (e.button !== 0 || win.isMaximized || innerWidth < 720 || (e.target as HTMLElement).closest('button')) return; e.currentTarget.setPointerCapture(e.pointerId); setGesture({ x: e.clientX, y: e.clientY, wx: win.x, wy: win.y, w: win.width, h: win.height, resize }); };
  const move = (e: PointerEvent) => { if (!gesture) return; const dx = e.clientX - gesture.x, dy = e.clientY - gesture.y; if (gesture.resize) manager.updateWindow(win.id, { width: Math.max(300, Math.min(innerWidth - win.x - 12, gesture.w + dx)), height: Math.max(250, Math.min(innerHeight - win.y - 90, gesture.h + dy)) }); else manager.updateWindow(win.id, { x: gesture.wx + dx, y: Math.min(innerHeight - 130, gesture.wy + dy) }); };
  return <section className={`os-window app-${win.id} ${win.isFocused ? 'focused' : ''} ${win.isMaximized ? 'maximized' : ''}`} aria-label={win.title} style={{ left: win.x, top: win.y, width: win.width, height: win.height, zIndex: win.zIndex, display: win.isMinimized ? 'none' : undefined }} onPointerDown={() => { if (!win.isFocused) manager.focusWindow(win.id); }} onFocusCapture={() => { if (!win.isFocused) manager.focusWindow(win.id); }}>
    <div className="window-titlebar" onPointerDown={e => start(e)} onPointerMove={move} onPointerUp={() => setGesture(null)} onPointerCancel={() => setGesture(null)} onDoubleClick={e => { if (!(e.target as HTMLElement).closest('button')) manager.maximizeWindow(win.id); }}>
      <div className="traffic-lights"><button className="close" aria-label={`Close ${win.title}`} onClick={() => manager.closeWindow(win.id)}><X size={8}/></button><button className="minimize" aria-label={`Minimize ${win.title}`} onClick={() => manager.minimizeWindow(win.id)}><Minus size={8}/></button><button className="maximize" aria-label={`Resize ${win.title} to ${win.isMaximized ? 'window' : 'full screen'}`} onClick={() => manager.maximizeWindow(win.id)}><Maximize2 size={8}/></button></div>
      <span>{win.title}</span>
    </div><div className="window-content">{children}</div><div className="resize-handle" aria-hidden="true" onPointerDown={e => start(e, true)} onPointerMove={move} onPointerUp={() => setGesture(null)} onPointerCancel={() => setGesture(null)}/>
  </section>;
}
export default function Desktop() {
  const [windows, setWindows] = useState<WindowState[]>([]);
  const [clock, setClock] = useState(new Date());
  const [launcher, setLauncher] = useState(false);
  const [query, setQuery] = useState('');
  const [wallpaper, setWallpaper] = useState(false);
  const [about, setAbout] = useState(false);
  useEffect(() => { manager.subscribe('portfolio', map => { const list = [...map.values()]; const next = list.filter(w => !w.isMinimized).sort((a, b) => b.zIndex - a.zIndex)[0]; if (next && !list.some(w => w.isFocused && !w.isMinimized)) { manager.focusWindow(next.id); return; } setWindows(list); });
    if (manager.getAllWindows().length === 0) launch('browser');
    setWindows(manager.getAllWindows());
    const unsub = bounds.subscribe(() => { manager.getAllWindows().forEach(win => { const safe = bounds.getSafeDimensions(win.width, Math.min(win.height, innerHeight - 172)); manager.updateWindow(win.id, safe); }); manager.validateAndFixAllWindows(); });
    const interval = setInterval(() => setClock(new Date()), 30000);
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') { setLauncher(false); setAbout(false); } if ((event.metaKey || event.ctrlKey) && event.key === 'k') { event.preventDefault(); setLauncher(x => !x); } };
    window.addEventListener('keydown', key);
    return () => { manager.unsubscribe('portfolio'); unsub(); clearInterval(interval); window.removeEventListener('keydown', key); };
  }, []);
  const active = windows.find(w => w.isFocused && !w.isMinimized);
  const pinned: AppId[] = ['finder', 'browser', 'notes', 'music', 'contact'];
  const dockApps = [...pinned, ...apps.filter(a => !pinned.includes(a.id) && windows.some(w => w.id === a.id)).map(a => a.id)];
  const body = (id: AppId) => { switch(id) { case 'finder': return <Finder/>; case 'browser': return <Portfolio/>; case 'notes': return <Notes/>; case 'music': return <MusicPlayer/>; case 'videos': return <Videos/>; case 'assistant': return <Assistant/>; case 'contact': return <Contact/>; case 'terminal': return <Suspense fallback={<p className="loading-app">Warming up the phosphor…</p>}><CRTApp active={!!windows.find(w => w.id === id && !w.isMinimized)}/></Suspense>; default: return <Welcome/>; } };
  return <div className={`aspect-desktop ${wallpaper ? 'wallpaper-night' : ''}`}>
    <header className="os-menubar"><button className="aspect-brand" onClick={() => launch('welcome')} aria-label="About Will Dzierson"><Command size={16}/><strong>Will Dzierson</strong></button><span className="active-app">{active?.title || 'Desktop'}</span><button aria-expanded={launcher} onClick={() => setLauncher(!launcher)}>Apps <ChevronDown size={10}/></button><button aria-label="Show desktop" onClick={() => windows.forEach(w => manager.minimizeWindow(w.id))}><span className="show-desktop-label">Show desktop</span><Minus className="show-desktop-icon" size={16}/></button><div className="menubar-right"><button aria-expanded={about} onClick={() => setAbout(!about)}>About</button><time dateTime={clock.toISOString()}>{clock.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</time></div></header>
    <div className="wallpaper-art" aria-hidden="true"><div className="wallpaper-sun"/><div className="wallpaper-fold"/></div>
    <nav className="desktop-files" aria-label="Desktop shortcuts"><button onClick={() => launch('finder')}><span className="drive-icon"><HardDrive size={32} strokeWidth={1.5}/><i/></span><span>Will’s drive</span></button></nav>
    {windows.map(win => <Frame key={win.id} win={win}>{body(win.id as AppId)}</Frame>)}
    {launcher && <aside className="app-launcher" aria-label="App launcher"><div className="launcher-search"><Search size={18}/><input autoFocus aria-label="Find an app" placeholder="Where would you like to go?" value={query} onChange={e => setQuery(e.target.value)}/><button aria-label="Close launcher" onClick={() => setLauncher(false)}><X size={15}/></button></div><div className="launcher-grid">{apps.filter(a => a.name.toLowerCase().includes(query.toLowerCase())).map(a => <button key={a.id} onClick={() => { launch(a.id); setLauncher(false); setQuery(''); }}><AppIcon id={a.id}/><span>{a.name}</span></button>)}</div>{!apps.some(a => a.name.toLowerCase().includes(query.toLowerCase())) && <p>No apps match “{query}”.</p>}<small>⌘ / Ctrl K to open · Esc to dismiss</small></aside>}
    {about && <aside className="os-concept-notes"><button aria-label="Close concept notes" onClick={() => setAbout(false)}><X size={17}/></button><span>CONCEPT 04</span><h2>The portfolio is<br/>the computer.</h2><p>A personal desktop, open to visitors. Work sits beside writing, music, experiments, and the things that make you curious.</p><p>Powered by Aspect’s actual window manager, with a new visual shell. Drag, resize, minimize, and reopen apps from the dock. On small screens, apps fill the workspace.</p><p>The terminal uses the existing CRT library. Willbot connects to the current workspace’s RAG service when you send a question. Music uses the track already in the newer portfolio.</p><p>Writing and video selections are labeled placeholders. Telegram needs your handle; nothing is sent from this preview.</p><button className="os-primary" onClick={() => setWallpaper(!wallpaper)}>Switch to {wallpaper ? 'daylight' : 'evening'}</button><a className="concept-backlink" href="/concepts.html">View the other concepts ↗</a></aside>}
    <nav className="os-dock" aria-label="Applications">{dockApps.map(id => { const app = apps.find(a => a.id === id)!; return <button key={id} aria-label={`Open ${app.name}`} onClick={() => launch(id)}><AppIcon id={id}/><span className="dock-tooltip">{app.name}</span><i className={windows.some(w => w.id === id) ? 'running' : ''}/></button>; })}<span className="dock-divider"/><button aria-label="All apps" aria-expanded={launcher} onClick={() => setLauncher(!launcher)}><span className="app-icon launcher-icon"><Grid2X2 size={25} strokeWidth={1.7}/></span><span className="dock-tooltip">All apps</span><i/></button></nav>

  </div>;
}
