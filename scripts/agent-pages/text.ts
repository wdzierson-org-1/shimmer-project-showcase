import { Marked, type Tokens } from 'marked';

/** Escape text for HTML element content and attribute values. */
export function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Keep plain text (titles, clients, roles) from turning into Markdown syntax or raw HTML. */
export function escapeMarkdown(value: string): string {
  return value.replace(/[\\`*_[\]<>|~]/g, '\\$&');
}

const urlCodes: Record<string, string> = { '(': '%28', ')': '%29', '<': '%3C', '>': '%3E' };
/** Make a URL safe to place in a Markdown link destination. */
export function mdUrl(url: string): string {
  return url.replace(/[\s()<>]/g, c => urlCodes[c] ?? encodeURIComponent(c));
}

/** Normalize CMS text: line endings, non-breaking spaces, trailing spaces, and runs of blank lines. */
export function cleanText(value = ''): string {
  return value.replace(/\r\n?/g, '\n').replace(/\u00a0/g, ' ').replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n').trim();
}

/** Markdown reduced to one line of plain text, for summaries and meta descriptions. */
export function plainText(markdown: string): string {
  return markdown
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]*>/g, ' ')
    .replace(/^[ \t]*(?:#{1,6}[ \t]+|>[ \t]?|[-*+][ \t]+|\d+[.)][ \t]+)/gm, '')
    .replace(/\*\*|__|~~|`|\*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Shorten text at a sentence boundary, or failing that a word boundary. */
export function summarize(text: string, max = 160): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const sentence = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('? '), cut.lastIndexOf('! '));
  if (sentence > max * 0.5) return cut.slice(0, sentence + 1);
  const space = cut.lastIndexOf(' ');
  return `${cut.slice(0, space > 0 ? space : cut.length).replace(/[\s,;:.–—-]+$/, '')}…`;
}

export const isWebUrl = (url: string | null | undefined): url is string => !!url && /^https?:\/\//i.test(url);

/** "April 6, 2026" from an ISO timestamp. */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

/** Keep web, mail, and relative links. Script and data URLs are dropped, even when disguised with control characters. */
function safeHref(href: string): string | null {
  const visible = [...href].filter(c => { const code = c.charCodeAt(0); return code > 0x20 && (code < 0x7f || code > 0x9f); }).join('');
  const scheme = visible.match(/^([a-z][a-z0-9+.-]*):/i)?.[1].toLowerCase();
  if (scheme && !['http', 'https', 'mailto', 'tel'].includes(scheme)) return null;
  try { return encodeURI(href.trim()).replace(/%25/g, '%'); } catch { return null; }
}

const markdown = new Marked({
  gfm: true,
  renderer: {
    // Like the site's ReactMarkdown, raw HTML in CMS text shows as text and never becomes markup.
    html({ text }: Tokens.HTML | Tokens.Tag) { return escapeHtml(text); },
    link({ href, title, tokens }: Tokens.Link) {
      const label = this.parser.parseInline(tokens), url = safeHref(href);
      return url ? `<a href="${escapeHtml(url)}"${title ? ` title="${escapeHtml(title)}"` : ''}>${label}</a>` : label;
    },
    image({ text }: Tokens.Image) { return escapeHtml(text); },
  },
});

export function markdownToHtml(source: string): string {
  return markdown.parse(source, { async: false }) as string;
}
