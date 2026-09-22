/**
 * Terminal link parsing for CRTHero: markdown [label](url) and raw URLs.
 * Used to build display text + clickable spans for the CRT terminal.
 */

export type TerminalLinkSpan = {
  colStart: number;
  colEnd: number;
  label: string;
  href: string;
};

/** Strip bold/italic/code/headings without touching markdown links. */
export function stripMarkdownKeepLinks(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/gs, '$1')
    .replace(/\*(.+?)\*/gs, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^#{1,6}\s+/gm, '');
}

export function stripMarkdownRest(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/gs, '$1')
    .replace(/\*(.+?)\*/gs, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^#{1,6}\s+/gm, '');
}

export function normalizeHref(raw: string, baseOrigin: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  try {
    if (s.startsWith('mailto:') || s.startsWith('tel:')) {
      return s;
    }
    const u = new URL(s, baseOrigin);
    return u.href;
  } catch {
    return null;
  }
}

/** Replace [label](url) with [label], return spans for bracket text in output coordinates. */
export function replaceMarkdownLinks(
  line: string,
  baseOrigin: string,
): { text: string; spans: { start: number; end: number; href: string }[] } {
  const spans: { start: number; end: number; href: string }[] = [];
  let output = '';
  let lastIndex = 0;
  const re = /\[([^\]]+)\]\(([^)]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    output += line.slice(lastIndex, m.index);
    const label = m[1]!;
    const href = normalizeHref(m[2]!, baseOrigin);
    const start = output.length;
    const segment = `[${label}]`;
    output += segment;
    const end = output.length - 1;
    if (href) {
      spans.push({ start, end, href });
    }
    lastIndex = m.index + m[0].length;
  }
  output += line.slice(lastIndex);
  return { text: output, spans };
}

const RAW_URL_RE = /(?:https?:\/\/|mailto:|tel:)[^\s\]]+/gi;

function trimTrailingPunct(url: string): string {
  return url.replace(/[.,;:!?)]+$/g, '');
}

/** Find raw URL spans; optionally exclude ranges that overlap md spans. */
export function findRawUrlSpans(
  text: string,
  exclude: { start: number; end: number }[],
  baseOrigin: string,
): { start: number; end: number; href: string }[] {
  const out: { start: number; end: number; href: string }[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(RAW_URL_RE.source, RAW_URL_RE.flags);
  while ((m = re.exec(text)) !== null) {
    const idx = m.index;
    const raw = trimTrailingPunct(m[0]!);
    const end = idx + raw.length - 1;
    const overlaps = exclude.some(
      (e) => !(end < e.start || idx > e.end),
    );
    if (overlaps) continue;
    const href = normalizeHref(raw, baseOrigin);
    if (href) {
      out.push({ start: idx, end, href });
    }
  }
  return out;
}

export function wrapTextWithOffsets(
  text: string,
  cols: number,
): { line: string; startOffset: number }[] {
  if (!text) return [{ line: '', startOffset: 0 }];
  const words = text.split(' ');
  const lines: { line: string; startOffset: number }[] = [];
  let current = '';
  let lineStartOffset = 0;
  let pos = 0;

  for (let wi = 0; wi < words.length; wi++) {
    const word = words[wi]!;
    if (wi > 0) pos += 1;
    if (current.length === 0) {
      current = word;
      lineStartOffset = pos;
    } else if (current.length + 1 + word.length <= cols) {
      current += ' ' + word;
    } else {
      lines.push({ line: current, startOffset: lineStartOffset });
      current = word;
      lineStartOffset = pos;
    }
    pos += word.length;
  }
  if (current.length > 0) lines.push({ line: current, startOffset: lineStartOffset });
  return lines.length > 0 ? lines : [{ line: '', startOffset: 0 }];
}

export function spansToLineLinks(
  line: string,
  lineStartInFull: number,
  spans: { start: number; end: number; href: string }[],
): TerminalLinkSpan[] {
  const links: TerminalLinkSpan[] = [];
  const lineEnd = lineStartInFull + line.length;
  for (const s of spans) {
    if (s.end < lineStartInFull || s.start >= lineEnd) continue;
    const localStart = Math.max(0, s.start - lineStartInFull);
    const localEnd = Math.min(line.length - 1, s.end - lineStartInFull);
    const label = line.slice(localStart, localEnd + 1);
    links.push({
      colStart: localStart,
      colEnd: localEnd,
      label,
      href: s.href,
    });
  }
  return links;
}

/** Full pipeline for one paragraph line (no \n inside). */
export function prepareTerminalParagraphLine(
  rawLine: string,
  baseOrigin: string,
): { text: string; spans: { start: number; end: number; href: string }[] } {
  const step1 = stripMarkdownKeepLinks(rawLine);
  const step2 = stripMarkdownRest(step1);
  const { text, spans: mdSpans } = replaceMarkdownLinks(step2, baseOrigin);
  const urlSpans = findRawUrlSpans(text, mdSpans, baseOrigin);
  const allSpans = [...mdSpans, ...urlSpans].sort((a, b) => a.start - b.start);

  return { text, spans: allSpans };
}
