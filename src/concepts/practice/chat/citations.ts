import type { ChatSource } from './sources';

/** Match canonical and relative links without accepting invented domains. */
export function citationUrl(href: string) {
  try {
    const url = new URL(href, 'https://dzierson.com/');
    if (url.origin === 'https://www.dzierson.com') url.hostname = 'dzierson.com';
    return url.href;
  } catch { return href; }
}

/** Match complete, validated Markdown citations, in the order they occur. Merely mentioning a title is not a citation. */
export function citedSources(text: string, sources: ChatSource[]) {
  const found: ChatSource[] = [];
  const prose = text.replace(/```[\s\S]*?(?:```|$)/g, '').replace(/`[^`]*`/g, '');
  for (const match of prose.matchAll(/(?<!!)\[[^\]\n]+\]\(\s*<?([^\s)>]+)>?\s*\)/g)) {
    const source = sources.find(s => citationUrl(s.url) === citationUrl(match[1]));
    if (source && !found.some(s => s.id === source.id)) found.push(source);
  }
  return found;
}
