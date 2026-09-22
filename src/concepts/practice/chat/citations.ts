import type { ChatSource } from './sources';

/** Match complete, validated Markdown citations, in the order they occur. Merely mentioning a title is not a citation. */
export function citedSources(text: string, sources: ChatSource[]) {
  const normalize = (url: string) => url.startsWith('#') ? `/practice.html${url}` : url;
  const found: ChatSource[] = [];
  const prose = text.replace(/```[\s\S]*?(?:```|$)/g, '').replace(/`[^`]*`/g, '');
  for (const match of prose.matchAll(/(?<!!)\[[^\]\n]+\]\(\s*<?([^\s)>]+)>?\s*\)/g)) {
    const source = sources.find(s => normalize(s.url) === normalize(match[1]));
    if (source && !found.some(s => s.id === source.id)) found.push(source);
  }
  return found;
}
