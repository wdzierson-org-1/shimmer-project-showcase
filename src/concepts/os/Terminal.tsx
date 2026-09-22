import { useEffect, useRef, useState } from 'react';
import { CRTTerminal } from 'cool-retro-term-renderer';
import { apps, launch } from './model';
function updateDisplay(crt: CRTTerminal, text: string) {
  const { cols, rows } = crt.getGridSize();
  const width = Math.max(1, cols - 2);
  const wrapped = text.split('\n').flatMap(line => {
    const characters = Array.from(line);
    if (!characters.length) return [''];
    const chunks: string[] = [];
    for (let i = 0; i < characters.length; i += width) chunks.push(characters.slice(i, i + width).join(''));
    return chunks;
  });
  crt.getTerminalText().setCursorVisible(false);
  crt.getTerminalText().setText(wrapped.slice(-Math.max(1, rows - 1)).join('\n'));
}
const greeting = 'ASPECT / PERSONAL TERMINAL\n\nWelcome to Will’s corner of the internet.\n\nType help to see what you can do.\nTry: ls · open music · open browser · whoami\n';
export default function TerminalApp({ active, commandHandler, initialMessage = greeting }: { active: boolean; commandHandler?: (command: string) => string | Promise<string>; initialMessage?: string }) {
  const container = useRef<HTMLDivElement>(null); const renderer = useRef<CRTTerminal | null>(null); const [lines, setLines] = useState(initialMessage); const [command, setCommand] = useState(''); const [effects, setEffects] = useState(() => !matchMedia('(prefers-reduced-motion: reduce)').matches); const [overscan, setOverscan] = useState(0); const [fallback, setFallback] = useState(false); const latest = useRef(lines); latest.current = lines;
  const inputRef = useRef<HTMLInputElement>(null); const [busy, setBusy] = useState(false); const history = useRef<string[]>([]); const historyIndex = useRef(0); const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { if (active && !busy) inputRef.current?.focus({ preventScroll: true }); }, [active, busy]);
  useEffect(() => {
    const host = container.current;
    if (!host || !active || !effects) return;
    let crt: CRTTerminal | undefined;
    let width = 0, height = 0;
    // The renderer retains canvas texture dimensions after resizing. Recreate
    // its GPU resources when the host changes size to keep the texture valid.
    const fit = () => {
      if (width === host.clientWidth && height === host.clientHeight) return;
      width = host.clientWidth; height = host.clientHeight;
      crt?.dispose(); renderer.current = null;
      if (!width || !height) return;
      try {
        crt = new CRTTerminal({ container: host, fontColor: '#b5c9a4', backgroundColor: '#171e19', screenCurvature: .12, bloom: .28, brightness: .65, ambientLight: .06, flickering: 0, horizontalSync: 0, jitter: 0, staticNoise: .015, glowingLine: 0, burnIn: .15, rasterizationMode: 1, rasterizationIntensity: .2, rgbShift: 0 });
        renderer.current = crt;
        updateDisplay(crt, latest.current);
        crt.getTerminalText().onGridSizeChange(() => { if (crt) updateDisplay(crt, latest.current); });
        setFallback(false);
      } catch { setFallback(true); }
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(host);
    return () => { observer.disconnect(); crt?.dispose(); renderer.current = null; };
  }, [active, effects]);
  useEffect(() => { if (renderer.current) updateDisplay(renderer.current, lines); }, [lines]);
  async function run() { const value = command.trim(); if (!value || busy) return; history.current.push(value); historyIndex.current = history.current.length; setCommand(''); if (value === 'clear') { setLines(''); return; } let response = '';
    if (commandHandler) { setLines(old => `${old}\nvisitor ~ % ${value}\n`); setBusy(true); try { response = await commandHandler(value); } catch { response = 'The request could not be completed. Please try again.'; } if (mounted.current) { setLines(old => `${old}${response}\n`.slice(-15000)); setBusy(false); inputRef.current?.focus({ preventScroll: true }); } return; }
    if (value === 'help') response = 'ls                 List available apps\nopen <app>         Open an app\nwhoami             About Will\nask                Open the portfolio AI\nclear              Clear the screen\nNo shell access. Just a different way to explore.';
    else if (value === 'ls') response = apps.map(a => a.id).join('  ');
    else if (value === 'whoami') response = 'Will Dzierson\nDesign technologist & AI entrepreneur.\nI love to design. I also love to build.';
    else if (value === 'ask') { launch('assistant'); response = 'Willbot opened. Ask a question in its window.'; }
    else if (value.startsWith('open ')) { const id = value.slice(5).trim().toLowerCase(); const app = apps.find(a => a.id === id || a.name.toLowerCase() === id); if (app) { launch(app.id); response = `Opening ${app.name}…`; } else response = `App not found: ${id}. Type ls for available apps.`; }
    else response = `Unknown command: ${value}. Try help.`;
    setLines(old => `${old}\nvisitor@aspect ~ % ${value}\n${response}\n`.slice(-10000));
  }
  return <div className="terminal-app"><div className="terminal-controls"><span>visitor@aspect ~</span><label>Overscan <input aria-label="Terminal overscan" type="range" min="0" max="8" value={overscan} onChange={e => setOverscan(Number(e.target.value))}/></label><button onClick={() => setEffects(!effects)}>{effects ? 'Plain text' : 'CRT display'}</button></div><div className="terminal-display" onClick={() => inputRef.current?.focus({ preventScroll: true })}><div ref={container} className="crt-canvas" aria-hidden="true" style={{ transform: `scale(${1 + overscan / 100})`, display: effects && !fallback ? 'block' : 'none' }}/><pre className={effects && !fallback ? 'accessible-terminal' : 'plain-terminal'} aria-live="polite">{lines}</pre></div><form onSubmit={e => { e.preventDefault(); run(); }}><label htmlFor="terminal-command">visitor ~ %</label><input ref={inputRef} id="terminal-command" disabled={busy} onKeyDown={e => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); historyIndex.current = Math.max(0, Math.min(history.current.length, historyIndex.current + (e.key === 'ArrowUp' ? -1 : 1))); setCommand(history.current[historyIndex.current] || ''); } if (e.ctrlKey && e.key === 'l') { e.preventDefault(); setLines(''); } }} autoComplete="off" spellCheck={false} value={command} onChange={e => setCommand(e.target.value)} placeholder="help" maxLength={300}/><button disabled={busy}>{busy ? 'Working…' : 'Run ↵'}</button></form></div>;
}
