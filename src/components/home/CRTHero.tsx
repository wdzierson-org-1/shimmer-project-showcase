import { useEffect, useRef, useState } from 'react';
import { CRTTerminal } from 'cool-retro-term-renderer';
import { Terminal } from '@xterm/xterm';
import { SerializeAddon } from '@xterm/addon-serialize';
import { processUserMessage } from '@/services/chatService';
import { classifyWillbotRequestMode } from '@/services/chat/messageProcessor';
import {
  generateShortcut1Response,
  generateShortcut2Response,
  generateShortcut3Response,
} from '@/services/chat/personaContext';
import type { ConversationMessage } from '@/services/chat/willbotPrompt';
import { savePrompt } from '@/services/promptTrackingService';

const TERMINAL_STATE_KEY = 'crtTerminalState';
const TERMINAL_META_KEY = 'crtTerminalMeta';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// Nav bar height (matches Header.tsx pt-3 + content + pb-[10px])
const NAV_H = 48;

// Inset margin around the CRT canvas — the dark parent background shows through
const TERMINAL_MARGIN = 12;

// Virtual terminal width used as the 1x reference for CSS font scaling.
// At 1440 px the CRT renders at exactly natural size (scale = 1.0), which
// matches typical laptop/desktop resolutions. Narrower viewports scale
// down proportionally; wider viewports use additional virtual columns
// instead of indefinitely enlarging the text.
const BASE_W = 1440;
const BASE_FONT_SIZE = 14;
const MAX_FONT_REM = 0.65625;
const HIDE_CURSOR = '\x1b[?25l';
const SHOW_CURSOR = '\x1b[?25h';
const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'] as const;
const PROMPT_WAIT_MESSAGES = [
  'Pulling that together for you...',
  'Thinking in phosphor...',
  'Checking Willbot memory...',
  'One sec while I line this up...',
] as const;
const RETRIEVAL_WAIT_MESSAGES = [
  'Searching datastore for more information...',
  'Querying knowledge base...',
  'Cross-referencing project archives...',
  'Scanning notes, projects, and traces...',
] as const;

// ANSI color escapes for terminal UI chrome
const INTERSTITIAL_COLOR = '\x1b[38;5;67m';       // dim teal — distinguishable from phosphor response text

/** ms of idle at prompt before dim “ghost” hint appears */
const GHOST_IDLE_MS = 5000;
const CONTINUATION_PREFIX = 'Continue with more detail about';

// ── Boot sequence copy ────────────────────────────────────────────────────────
// "Retro view of a futuristic technology" — sci-fi flavour, not vintage kitsch.
const BOOT_LINES: { text: string; delay: number }[] = [
  { text: 'NEURAL LINK v4.2 -- Cognitive handshake... OK', delay: 80 },
  { text: 'Syncing WILLBOT-OS 2026.04-LTS...', delay: 300 },
  { text: 'Loading identity substrate............... done', delay: 540 },
  { text: 'Indexing project memory.................. done', delay: 460 },
  { text: 'Calibrating knowledge mesh............... done', delay: 620 },
  { text: '', delay: 160 },
  { text: '\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557', delay: 60 },
  { text: '  WILLBOT AI TERMINAL  [READY]', delay: 60 },
  { text: '  Design \u00b7 Engineering \u00b7 Craft', delay: 60 },
  { text: '\u255a\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255d', delay: 160 },
  { text: '', delay: 220 },
  { text: "Hello. I'm Willbot -- an AI built on Will's", delay: 80 },
  { text: 'work, thinking, and creative process.', delay: 160 },
  { text: '', delay: 120 },
  { text: 'Feel free to ask me anything about Will,', delay: 80 },
  { text: 'or choose a shortcut:', delay: 80 },
  { text: '  1] Summarize recent work + projects', delay: 60 },
  { text: "  2] Will's process", delay: 60 },
  { text: '  3] In-flight / current projects', delay: 60 },
  { text: '', delay: 280 },
];

// ── Utilities ─────────────────────────────────────────────────────────────────

// Poll until the element has real layout dimensions. CRTTerminal reads
// clientWidth/Height synchronously in its constructor — zero dims causes
// render targets to initialise incorrectly and never fully recover.
function waitForDimensions(el: HTMLElement): Promise<void> {
  return new Promise(resolve => {
    const check = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) resolve();
      else requestAnimationFrame(check);
    };
    check();
  });
}

// Strip markdown syntax that looks noisy in a plain-text terminal.
// Preserves bare [text] bracket links (they are hoverable/clickable in the terminal).
// Only strips markdown-URL form [text](url) → [text] to keep the bracket as a link.
function stripMarkdown(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '[$1]')  // [label](url) → [label]  (keep brackets)
    .replace(/\*\*(.+?)\*\*/gs, '$1')             // **bold** → bold
    .replace(/\*(.+?)\*/gs, '$1')                 // *italic* → italic
    .replace(/`([^`]+)`/g, '$1')                  // `code` → code
    .replace(/^#{1,6}\s+/gm, '');                 // # Heading → Heading
}

// Extract bracket links from a line of text, returning { label, colStart, colEnd }[]
// colStart/colEnd are 0-indexed character positions within the line.
function extractBracketLinks(line: string): { label: string; colStart: number; colEnd: number }[] {
  const results: { label: string; colStart: number; colEnd: number }[] = [];
  const re = /\[([^\]]+)\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    results.push({ label: m[1]!, colStart: m.index, colEnd: m.index + m[0].length - 1 });
  }
  return results;
}

function wrapText(text: string, cols: number): string[] {
  if (!text) return [''];
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if (current.length === 0) {
      current = word;
    } else if (current.length + 1 + word.length <= cols) {
      current += ' ' + word;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current.length > 0) lines.push(current);
  return lines.length > 0 ? lines : [''];
}

const CRTHero = () => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hiddenRef = useRef<HTMLDivElement>(null);
  const crtRef = useRef<CRTTerminal | null>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const inputBufRef = useRef('');
  const historyRef = useRef<string[]>([]);
  const historyIdxRef = useRef<number | null>(null);
  const isProcessingRef = useRef(false);
  const isBootingRef = useRef(true);
  const bootAbortRef = useRef(false);
  /** Project titles for the last numbered list (1–N); numeric input selects one */
  const pendingOptionsRef = useRef<{ title: string }[]>([]);
  /** Rolling conversation history passed to the LLM on each turn (capped at 20 messages) */
  const conversationHistoryRef = useRef<ConversationMessage[]>([]);
  const ghostTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const ghostVisibleRef = useRef(false);
  const lastTopicRef = useRef("Will's work");
  /** Registry of bracket links rendered in the terminal: row/col positions for hover detection */
  const linkRegistryRef = useRef<{ row: number; colStart: number; colEnd: number; label: string }[]>([]);
  /** Currently hovered link index in the registry, or -1 */
  const hoveredLinkRef = useRef<number>(-1);
  /** Cached scale factor from applyLayout for mouse→cell conversion */
  const scaleRef = useRef<number>(1);
  /** Cached cell dimensions from xterm for mouse→cell conversion */
  const cellDimsRef = useRef<{ w: number; h: number }>({ w: 8.4, h: 17 });

  // Ghost text is rendered as an HTML overlay (not through xterm) so the WebGL
  // phosphor shader cannot override its color. The CRT renderer maps all terminal
  // characters to a single fontColor — ANSI 256-color and SGR dim are both ignored.
  const [ghostText, setGhostText] = useState<string | null>(null);
  const setGhostTextRef = useRef(setGhostText);
  /** Row index (xterm buffer) at which the ghost overlay should be positioned */
  const ghostRowRef = useRef<number>(0);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const container = containerRef.current;
    const hidden = hiddenRef.current;
    if (!wrapper || !container || !hidden) return;

    // ── Layout / font scaling ─────────────────────────────────────────────────
    // The CRT renders at BASE_W virtual CSS pixels; a CSS transform scales the
    // output to fill the wrapper. Setting BASE_W = 1440 means that on a 1440 px
    // wide viewport (common laptop/desktop) the font appears at exactly its
    // natural rendered size. Narrower screens scale down; wider screens clamp
    // to a root-font-relative max scale and gain more virtual columns instead.
    //
    // Bezel elimination: TerminalFrame hardcodes a ~30 px shadow margin from
    // each CRT canvas edge. Positioning the container at (-offset, -offset)
    // and sizing it to effectiveBaseW+60 × (wrapH/s+60) keeps the frame margin
    // exactly at the overflow:hidden clip boundary at any scale.
    const FRAME_M = 30;
    const applyLayout = (w: number, h: number) => {
      if (w === 0 || h === 0) return;
      const rootPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const maxRenderedFontPx = rootPx * MAX_FONT_REM;
      const maxScale = maxRenderedFontPx / BASE_FONT_SIZE;
      const rawScale = w / BASE_W;
      const scale = Math.min(rawScale, maxScale);
      scaleRef.current = scale;
      const virtualWidth = Math.round(w / scale);
      // The bezel shadow is part of the rendered CRT frame, so its crop offset
      // tracks the on-screen scale rather than the unscaled virtual dimensions.
      const offset = Math.round(FRAME_M * scale);
      container.style.left = `-${offset}px`;
      container.style.top = `-${offset}px`;
      container.style.width = `${virtualWidth + FRAME_M * 2}px`;
      container.style.height = `${Math.round(h / scale) + FRAME_M * 2}px`;
      container.style.transform = `scale(${scale})`;
      container.style.transformOrigin = 'top left';
    };

    // xterm instance — no PTY; we drive input ourselves
    const xterm = new Terminal({
      cursorBlink: true,
      cursorStyle: 'block',
      fontSize: 14,
      fontFamily: '"IBM Plex Mono", "Courier New", monospace',
      scrollback: 800,
      disableStdin: false,
      allowTransparency: false,
    });

    xterm.open(hidden);
    xtermRef.current = xterm;

    const serializeAddon = new SerializeAddon();
    xterm.loadAddon(serializeAddon);

    const saveTerminalState = () => {
      try {
        localStorage.setItem(TERMINAL_STATE_KEY, serializeAddon.serialize());
        localStorage.setItem(TERMINAL_META_KEY, JSON.stringify({
          lastTopic: lastTopicRef.current,
          pendingOptions: pendingOptionsRef.current,
        }));
      } catch {
        // localStorage may be unavailable (private mode, quota exceeded)
      }
    };

    let cancelled = false;
    let crt: CRTTerminal | null = null;
    let resizeObserver: ResizeObserver | null = null;

    (async () => {
      await waitForDimensions(wrapper);
      if (cancelled) return;

      applyLayout(wrapper.clientWidth, wrapper.clientHeight);

      // ── CRT WebGL renderer ──────────────────────────────────────────────────
      // Colors: near-black charcoal + steel-blue phosphor.
      // burnIn nudged back up slightly from the dialed-back state so moving text
      // leaves a light, readable afterimage without returning to the earlier
      // overdone trail.
      // bloom reduced to 0.28 — less phosphor halo.
      // rasterizationIntensity raised to 0.22 — scanlines now faintly visible.
      // We do NOT override renderer.setPixelRatio() — doing so desynchronises
      // TerminalText's internal devicePixelRatio from the Three.js canvas ratio.
      crt = new CRTTerminal({
        container,
        fontColor: '#88c0d0',
        backgroundColor: '#111118',
        screenCurvature: 0,
        bloom: 0.28,
        brightness: 0.58,
        ambientLight: 0.06,
        flickering: 0.06,
        horizontalSync: 0.005,
        jitter: 0.01,
        staticNoise: 0.02,
        glowingLine: 0.06,
        burnIn: 0.25,
        rasterizationMode: 1,
        rasterizationIntensity: 0.22,
        rgbShift: 0,
      });
      crtRef.current = crt;
      crt.attachXTerm(xterm);

      // ── Resize handling ───────────────────────────────────────────────────
      const handleResize = () => {
        applyLayout(wrapper.clientWidth, wrapper.clientHeight);
        window.dispatchEvent(new Event('resize'));
      };
      resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(wrapper);

      // ── Bracket link hover / click ────────────────────────────────────────
      // Convert mouse position over the CRT canvas to terminal (col, row) using
      // the CSS scale factor and xterm cell dimensions.
      const pixelToCell = (offsetX: number, offsetY: number): { col: number; row: number } => {
        const scale = scaleRef.current;
        const { w: cw, h: ch } = cellDimsRef.current;
        // The CRT canvas is offset by FRAME_M*scale from the container edge
        const FRAME_M = 30;
        const frameOffset = FRAME_M * scale;
        const termX = (offsetX + frameOffset) / scale;
        const termY = (offsetY + frameOffset) / scale;
        // xterm renders with a small viewport margin (~3px left, varies)
        const XTERM_PAD_LEFT = 3;
        const XTERM_PAD_TOP = 3;
        const col = Math.floor((termX - XTERM_PAD_LEFT) / cw);
        const row = Math.floor((termY - XTERM_PAD_TOP) / ch);
        return { col, row };
      };

      const findLinkAt = (col: number, row: number): number => {
        const viewportRow = row + (xterm as unknown as { buffer: { active: { viewportY: number } } }).buffer.active.viewportY;
        return linkRegistryRef.current.findIndex(
          (l) => l.row === viewportRow && col >= l.colStart && col <= l.colEnd,
        );
      };

      const handleMouseMove = (e: MouseEvent) => {
        if (isProcessingRef.current || isBootingRef.current) return;
        const rect = container.getBoundingClientRect();
        const { col, row } = pixelToCell(e.clientX - rect.left, e.clientY - rect.top);
        const idx = findLinkAt(col, row);

        if (idx !== hoveredLinkRef.current) {
          // Restore previous hover
          if (hoveredLinkRef.current >= 0) {
            const prev = linkRegistryRef.current[hoveredLinkRef.current];
            if (prev) {
              const absRow = prev.row - (xterm as unknown as { buffer: { active: { viewportY: number } } }).buffer.active.viewportY;
              xterm.write(`\x1b[${absRow + 1};${prev.colStart + 1}H\x1b[27m`);
              // Re-write the original text (brackets included) in normal color
              const label = `[${prev.label}]`;
              xterm.write(label);
              // Return cursor to current prompt position
              xterm.write('\x1b[?25l');
            }
          }
          // Apply new hover
          if (idx >= 0) {
            const link = linkRegistryRef.current[idx]!;
            const absRow = link.row - (xterm as unknown as { buffer: { active: { viewportY: number } } }).buffer.active.viewportY;
            xterm.write(`\x1b[${absRow + 1};${link.colStart + 1}H\x1b[7m`);
            const label = `[${link.label}]`;
            xterm.write(label);
            xterm.write('\x1b[0m\x1b[?25l');
            container.style.cursor = 'pointer';
          } else {
            container.style.cursor = 'text';
            xterm.write(SHOW_CURSOR);
          }
          hoveredLinkRef.current = idx;
        }
      };

      const handleLinkClick = (e: MouseEvent) => {
        if (isProcessingRef.current || isBootingRef.current) return;
        const rect = container.getBoundingClientRect();
        const { col, row } = pixelToCell(e.clientX - rect.left, e.clientY - rect.top);
        const idx = findLinkAt(col, row);
        if (idx >= 0) {
          const link = linkRegistryRef.current[idx]!;
          hoveredLinkRef.current = -1;
          const query = `Tell me more about "${link.label}".`;
          lastTopicRef.current = link.label.slice(0, 120);
          xterm.write(SHOW_CURSOR);
          // Simulate user typing the query
          xterm.write(`\r\n> ${query}\r\n`);
          handleUserInput(query);
        }
      };

      container.addEventListener('mousemove', handleMouseMove);
      container.addEventListener('click', handleLinkClick);

      // ── Helpers ──────────────────────────────────────────────────────────────
      const writePrompt = () => xterm.write('> ');

      const clearGhostSchedule = () => {
        if (ghostTimerRef.current != null) {
          window.clearTimeout(ghostTimerRef.current);
          ghostTimerRef.current = null;
        }
      };

      /** Dismiss the ghost overlay and cancel any pending timer. */
      const hideGhost = () => {
        clearGhostSchedule();
        ghostVisibleRef.current = false;
        setGhostTextRef.current(null);
      };

      /** Call when the user should see a fresh `> ` and may idle (starts ghost timer once). */
      const finishPromptLine = () => {
        // Persist before writing the prompt so the saved buffer never includes a trailing "> ".
        // On restore, xterm.write(savedState) replays up to the last response, then
        // finishPromptLine() writes exactly one clean prompt — no duplicates on navigation.
        if (!isBootingRef.current) saveTerminalState();
        writePrompt();
        clearGhostSchedule();
        ghostTimerRef.current = window.setTimeout(() => {
          if (cancelled || isProcessingRef.current || isBootingRef.current) return;
          if (inputBufRef.current.length > 0) return;
          ghostVisibleRef.current = true;
          const synopsis = lastTopicRef.current.slice(0, 56);
          // Capture current row so the overlay can be positioned correctly.
          ghostRowRef.current = (xterm as unknown as { buffer: { active: { cursorY: number } } }).buffer.active.cursorY;
          // Render ghost text as an HTML overlay — the CRT WebGL shader maps all
          // terminal characters to a single phosphor fontColor, so ANSI color codes
          // and SGR dim are both ignored. The overlay bypasses the shader entirely.
          setGhostTextRef.current(` type anything, or press Enter to explore more about ${synopsis}...`);
        }, GHOST_IDLE_MS);
      };

      const writeTypewriter = async (text: string, msPerChar = 10) => {
        xterm.write(HIDE_CURSOR);
        try {
          for (const ch of text) {
            xterm.write(ch);
            await sleep(msPerChar * (0.6 + Math.random() * 0.8));
          }
        } finally {
          xterm.write(SHOW_CURSOR);
        }
      };

      const renderInput = (value: string) => {
        hideGhost();
        xterm.write('\r\x1b[2K');
        writePrompt();
        if (value) xterm.write(value);
      };

      const startWaitingState = (mode: 'prompt' | 'retrieval') => {
        hideGhost();

        const messages = mode === 'retrieval' ? RETRIEVAL_WAIT_MESSAGES : PROMPT_WAIT_MESSAGES;
        let cancelled = false;
        let spinnerFrame = 0;

        // ── Spinner: runs independently via setInterval every 90ms ──────────────
        // Saves cursor position, jumps to col 1 on the waiting line, writes the
        // spinner glyph, then restores cursor to wherever the message typewriter is.
        // We use a shared `waitingRow` ref so the spinner can target the right line.
        const waitingRowRef = { current: -1 };

        xterm.write(HIDE_CURSOR);
        // Write initial spinner + space to establish the line
        xterm.write(`\r\x1b[2K${INTERSTITIAL_COLOR}${SPINNER_FRAMES[0]} \x1b[0m`);
        waitingRowRef.current = (xterm as unknown as { buffer: { active: { cursorY: number } } }).buffer.active.cursorY;

        const spinnerInterval = window.setInterval(() => {
          if (cancelled) return;
          spinnerFrame = (spinnerFrame + 1) % SPINNER_FRAMES.length;
          const row = waitingRowRef.current;
          if (row < 0) return;
          // Save cursor, jump to spinner col, write glyph, restore
          xterm.write(`\x1b[s\x1b[${row + 1};1H${INTERSTITIAL_COLOR}${SPINNER_FRAMES[spinnerFrame]}\x1b[0m\x1b[u`);
        }, 90);

        // ── Message typewriter: types message after spinner+space, then erases ──
        (async () => {
          let msgIdx = 0;

          while (!cancelled) {
            const msg = messages[msgIdx % messages.length]!;

            // Position cursor to col 3 (after "⠋ ") and type the message
            const row = waitingRowRef.current;
            if (row < 0) break;
            xterm.write(`\x1b[${row + 1};3H${INTERSTITIAL_COLOR}`);

            for (const ch of msg) {
              if (cancelled) break;
              xterm.write(ch);
              await sleep(14 * (0.7 + Math.random() * 0.6));
            }
            if (cancelled) break;

            // Hold
            await sleep(900);
            if (cancelled) break;

            // Erase message characters only (from right to left, starting after spinner+space)
            for (let i = 0; i < msg.length; i++) {
              if (cancelled) break;
              xterm.write('\b \b');
              await sleep(7);
            }
            if (cancelled) break;

            xterm.write('\x1b[0m');
            msgIdx += 1;
            await sleep(100);
          }
        })();

        return () => {
          cancelled = true;
          window.clearInterval(spinnerInterval);
          xterm.write('\r\x1b[2K\x1b[0m');
          xterm.write(SHOW_CURSOR);
        };
      };

      const writeResponse = async (raw: string) => {
        const responseText = stripMarkdown(raw);
        const cols = (xterm as unknown as { cols: number }).cols || 80;
        const paragraphs = responseText.split('\n');

        // Try to update cached cell dimensions from xterm internals
        try {
          const core = (xterm as unknown as { _core: { _renderService: { dimensions: { actualCellWidth: number; actualCellHeight: number } } } })._core;
          const dims = core._renderService.dimensions;
          if (dims.actualCellWidth > 0) {
            cellDimsRef.current = { w: dims.actualCellWidth, h: dims.actualCellHeight };
          }
        } catch { /* ignore — fallback values remain */ }

        for (const para of paragraphs) {
          if (para.trim() === '') {
            xterm.write('\r\n');
            await sleep(15);
            continue;
          }
          for (const line of wrapText(para, cols - 6)) {
            // Register any bracket links on this line before writing
            const currentRow = (xterm as unknown as { buffer: { active: { cursorY: number } } }).buffer.active.cursorY;
            const links = extractBracketLinks(line);
            const currentCol = 0; // lines always start at col 0 after \r\n
            for (const link of links) {
              linkRegistryRef.current.push({
                row: currentRow,
                colStart: currentCol + link.colStart,
                colEnd: currentCol + link.colEnd,
                label: link.label,
              });
            }
            await writeTypewriter(line, 5);
            xterm.write('\r\n');
          }
        }
      };

      const handleUserInput = async (rawInput: string) => {
        isProcessingRef.current = true;
        hideGhost();
        // Clear link registry for fresh response
        linkRegistryRef.current = [];
        hoveredLinkRef.current = -1;

        let input = rawInput;

        if (input === 'clear') {
          pendingOptionsRef.current = [];
          conversationHistoryRef.current = [];
          xterm.clear();
          xterm.write('\x1b[2J\x1b[H');
          // Wipe persisted state so next page load boots fresh
          try {
            localStorage.removeItem(TERMINAL_STATE_KEY);
            localStorage.removeItem(TERMINAL_META_KEY);
          } catch { /* ignore */ }
          isProcessingRef.current = false;
          finishPromptLine();
          return;
        }

        if (input === 'help') {
          pendingOptionsRef.current = [];
          const helpText = [
            '',
            'Available commands:',
            '  1  Summarize recent work + projects',
            "  2  Will's process",
            '  3  In-flight / current projects',
            '  clear  Clear the terminal',
            '  help   Show this message',
            '',
            'Or type any question about Will.',
            'When a numbered project list is shown, type a number to hear more.',
            '',
          ];
          for (const line of helpText) xterm.writeln(line);
          isProcessingRef.current = false;
          finishPromptLine();
          return;
        }

        // Pending project list: a lone digit selects that row (overrides shortcuts 1–3).
        const pending = pendingOptionsRef.current;
        const trimmed = input.trim();
        if (pending.length > 0 && /^\d+$/.test(trimmed)) {
          const idx = parseInt(trimmed, 10);
          if (idx >= 1 && idx <= pending.length && String(idx) === trimmed) {
            const title = pending[idx - 1]!.title;
            pendingOptionsRef.current = [];
            input = `Tell me more about the project "${title}".`;
            lastTopicRef.current = title.slice(0, 120);
          } else {
            pendingOptionsRef.current = [];
          }
        } else {
          pendingOptionsRef.current = [];
        }

        const isContinuation = input.startsWith(CONTINUATION_PREFIX);
        const moreProject = /^Tell me more about the project "([^"]+)"/i.exec(input);
        if (!isContinuation) {
          if (moreProject?.[1]) {
            lastTopicRef.current = moreProject[1]!.slice(0, 120);
          } else if (input.trim().length > 0) {
            lastTopicRef.current = input.trim().slice(0, 120);
          }
        }

        const stopSpinner = startWaitingState('prompt');

        // ── Numbered shortcuts (1 / 2 / 3) ────────────────────────────────────
        // Answered via persona LLM call — no vector search.
        if (input === '1' || input === '2' || input === '3') {
          let text: string;
          const history = conversationHistoryRef.current;
          try {
            if (input === '1') text = await generateShortcut1Response(history);
            else if (input === '2') text = await generateShortcut2Response(history);
            else text = await generateShortcut3Response(history);
          } catch {
            text = "Sorry, something went wrong fetching that. Try asking directly.";
          }
          savePrompt(input, text);
          stopSpinner();
          xterm.write('\r\n');
          await writeResponse(text);
          xterm.write('\r\n');
          // Append shortcut turn to conversation history
          conversationHistoryRef.current = [
            ...conversationHistoryRef.current,
            { role: 'user' as const, content: input },
            { role: 'assistant' as const, content: text },
          ].slice(-20);
          // Parse any AI-generated numbered list so digit input on next turn selects correctly.
          const shortcutListMatches = [...text.matchAll(/^\s*\d+\]\s*(.+)$/gm)];
          pendingOptionsRef.current = shortcutListMatches.map((m) => ({ title: m[1]!.trim() }));
          isProcessingRef.current = false;
          finishPromptLine();
          return;
        }

        // ── Full RAG pipeline for all other queries ────────────────────────────
        stopSpinner();
        const mode = classifyWillbotRequestMode(input);
        const stopWaitingState = startWaitingState(mode);

        let result: Awaited<ReturnType<typeof processUserMessage>>;
        try {
          result = await processUserMessage(input, conversationHistoryRef.current);
          savePrompt(input, result.content || '');
        } catch {
          stopWaitingState();
          xterm.write('\r\nSorry, something went wrong. Please try again.\r\n\r\n');
          isProcessingRef.current = false;
          finishPromptLine();
          return;
        }

        stopWaitingState();
        xterm.write('\r\n');
        await writeResponse(result.content || "I don't have information on that right now.");

        if (result.showProjects && result.projects && result.projects.length > 0) {
          const slice = result.projects.slice(0, 5);
          pendingOptionsRef.current = slice.map((p) => ({ title: p.title }));
          xterm.write('\r\n');
          await writeTypewriter('Related projects (type a number):', 5);
          xterm.write('\r\n');
          for (let i = 0; i < slice.length; i++) {
            const p = slice[i]!;
            await writeTypewriter(`  ${i + 1}] ${p.title}`, 4);
            xterm.write('\r\n');
          }
        } else {
          // Parse AI-generated numbered list (e.g. "1] Label\n2] Other") so digit
          // input on the next turn selects the correct item rather than triggering
          // the hardcoded global shortcuts.
          const aiListMatches = [...(result.content ?? '').matchAll(/^\s*\d+\]\s*(.+)$/gm)];
          if (aiListMatches.length > 0) {
            pendingOptionsRef.current = aiListMatches.map((m) => ({ title: m[1]!.trim() }));
          } else {
            pendingOptionsRef.current = [];
          }
        }

        // Append this turn to the rolling conversation history
        conversationHistoryRef.current = [
          ...conversationHistoryRef.current,
          { role: 'user' as const, content: input },
          { role: 'assistant' as const, content: result.content || '' },
        ].slice(-20);

        xterm.write('\r\n');
        isProcessingRef.current = false;
        finishPromptLine();
      };

      // ── Custom shell input handler ────────────────────────────────────────────
      xterm.onData((data) => {
        if (isBootingRef.current) {
          bootAbortRef.current = true;
          return;
        }
        if (isProcessingRef.current) return;
        const code = data.charCodeAt(0);
        if (data === '\x1b[A') {
          if (historyRef.current.length === 0) return;
          if (historyIdxRef.current === null) historyIdxRef.current = historyRef.current.length - 1;
          else historyIdxRef.current = Math.max(0, historyIdxRef.current - 1);
          inputBufRef.current = historyRef.current[historyIdxRef.current] ?? '';
          renderInput(inputBufRef.current);
        } else if (data === '\x1b[B') {
          if (historyRef.current.length === 0 || historyIdxRef.current === null) return;
          historyIdxRef.current += 1;
          if (historyIdxRef.current >= historyRef.current.length) {
            historyIdxRef.current = null;
            inputBufRef.current = '';
          } else {
            inputBufRef.current = historyRef.current[historyIdxRef.current] ?? '';
          }
          renderInput(inputBufRef.current);
        } else if (data === '\r') {
          if (ghostVisibleRef.current && inputBufRef.current.length === 0) {
            hideGhost();
            xterm.write('\r\x1b[2K\r\n');
            const msg = `${CONTINUATION_PREFIX} ${lastTopicRef.current}. Offer concrete next steps, open-ended follow-ups, and numbered options where helpful.`;
            handleUserInput(msg);
            return;
          }
          hideGhost();
          const input = inputBufRef.current.trim();
          inputBufRef.current = '';
          historyIdxRef.current = null;
          xterm.write('\r\n');
          if (input.length > 0) {
            historyRef.current.push(input);
            handleUserInput(input);
          } else {
            finishPromptLine();
          }
        } else if (data === '\x7f' || data === '\b') {
          if (ghostVisibleRef.current && inputBufRef.current.length === 0) {
            hideGhost();
            xterm.write('\r\x1b[2K');
            writePrompt();
            return;
          }
          if (inputBufRef.current.length > 0) {
            inputBufRef.current = inputBufRef.current.slice(0, -1);
            xterm.write('\b \b');
          }
        } else if (data === '\x03') {
          inputBufRef.current = '';
          hideGhost();
          xterm.write('^C\r\n');
          finishPromptLine();
        } else if (code >= 32 && code < 127) {
          if (ghostVisibleRef.current) {
            hideGhost();
            xterm.write('\r\x1b[2K');
            writePrompt();
          }
          inputBufRef.current += data;
          xterm.write(data);
        }
      });

      const handleClick = () => {
        if (isBootingRef.current) bootAbortRef.current = true;
        xterm.focus();
      };
      container.addEventListener('click', handleClick);

      // ── Boot sequence or state restore ────────────────────────────────────
      (async () => {
        const savedState = (() => {
          try { return localStorage.getItem(TERMINAL_STATE_KEY); } catch { return null; }
        })();

        if (savedState) {
          // Restore previous session — replay serialized buffer, skip boot.
          try {
            const meta = JSON.parse(localStorage.getItem(TERMINAL_META_KEY) || '{}');
            lastTopicRef.current = meta.lastTopic ?? "Will's work";
            if (Array.isArray(meta.pendingOptions)) {
              pendingOptionsRef.current = meta.pendingOptions;
            }
          } catch { /* ignore corrupt meta */ }

          xterm.write(savedState);
          isBootingRef.current = false;
          finishPromptLine();
          xterm.focus();
        } else {
          // Fresh boot sequence
          await sleep(200);
          let lineIndex = 0;
          for (; lineIndex < BOOT_LINES.length; lineIndex += 1) {
            const line = BOOT_LINES[lineIndex];
            if (bootAbortRef.current) break;
            await sleep(line.delay);
            if (bootAbortRef.current) break;
            if (line.text) await writeTypewriter(line.text, 9);
            xterm.write('\r\n');
          }
          if (bootAbortRef.current) {
            xterm.write(HIDE_CURSOR);
            for (; lineIndex < BOOT_LINES.length; lineIndex += 1) {
              xterm.writeln(BOOT_LINES[lineIndex].text);
            }
            xterm.write(SHOW_CURSOR);
          }
          isBootingRef.current = false;
          finishPromptLine();
          xterm.focus();
        }
      })();

      (container as HTMLElement & { _crtCleanup?: () => void })._crtCleanup = () => {
        resizeObserver?.disconnect();
        container.removeEventListener('click', handleClick);
        container.removeEventListener('mousemove', handleMouseMove);
        container.removeEventListener('click', handleLinkClick);
      };
    })();

    return () => {
      cancelled = true;
      if (ghostTimerRef.current != null) {
        window.clearTimeout(ghostTimerRef.current);
        ghostTimerRef.current = null;
      }
      // Final save before unmount
      if (!isBootingRef.current) saveTerminalState();
      resizeObserver?.disconnect();
      const el = container as HTMLElement & { _crtCleanup?: () => void };
      el._crtCleanup?.();
      delete el._crtCleanup;
      crt?.dispose();
      xterm.dispose();
    };
  }, []);

  return (
    // Fills the flex cell provided by Hero.tsx.
    // Height is controlled by the parent; we just fill it.
    <div
      className="relative w-full"
      style={{ height: '100%', background: '#111118' }}
    >
      {/* Off-screen xterm DOM mount */}
      <div
        ref={hiddenRef}
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: -9999,
          top: -9999,
          width: 800,
          height: 400,
          overflow: 'hidden',
          pointerEvents: 'none',
          opacity: 0,
        }}
      />

      {/* Terminal area below nav — wrapper observed for resize */}
      <div
        ref={wrapperRef}
        style={{
          position: 'absolute',
          top: NAV_H + TERMINAL_MARGIN,
          left: TERMINAL_MARGIN,
          right: TERMINAL_MARGIN,
          bottom: TERMINAL_MARGIN,
          overflow: 'hidden',
        }}
      >
        {/* CRT canvas mount — positioned and scaled dynamically by applyLayout */}
        <div
          ref={containerRef}
          className="cursor-text"
          style={{ position: 'absolute', top: 0, left: 0 }}
        />

        {/* Ghost text overlay — rendered in HTML so it bypasses the WebGL phosphor
            shader, which remaps all terminal character colors to a single fontColor.
            Positioned to sit on the prompt row, offset past "> " (2 chars). */}
        {ghostText && (
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: ghostRowRef.current * cellDimsRef.current.h * scaleRef.current,
              left: 2 * cellDimsRef.current.w * scaleRef.current,
              lineHeight: `${cellDimsRef.current.h * scaleRef.current}px`,
              fontSize: `${cellDimsRef.current.h * scaleRef.current * 0.72}px`,
              fontFamily: 'monospace',
              color: '#1a3a6b',
              opacity: 0.55,
              pointerEvents: 'none',
              whiteSpace: 'pre',
              zIndex: 10,
              userSelect: 'none',
            }}
          >
            {ghostText}
          </div>
        )}
      </div>
    </div>
  );
};

export default CRTHero;
