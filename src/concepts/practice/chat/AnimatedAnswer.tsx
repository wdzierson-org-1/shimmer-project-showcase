import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Root, Element, Text } from 'hast';
import type { ChatSource } from './sources';

/** Stable word nodes fade only as they arrive. Existing words retain their DOM identity. */
function revealWords() {
  return (root: Root) => {
    const walk = (node: Root | Element) => {
      if (node.type === 'element' && ['pre', 'code'].includes(node.tagName)) return;
      node.children = node.children.flatMap(child => {
        if (child.type === 'element') { walk(child); return [child]; }
        if (child.type !== 'text') return [child];
        return (child.value.match(/\s+|\S+/g) || []).map((value): Element | Text => /^\s+$/.test(value) ? { type: 'text', value } : {
          type: 'element', tagName: 'span', properties: { className: ['answer-word'] }, children: [{ type: 'text', value }],
        });
      });
    };
    walk(root);
  };
}
const plugins = [revealWords];
export default memo(function AnimatedAnswer({ content, streaming, sources }: { content: string; streaming: boolean; sources: ChatSource[] }) {
  // Don't expose a half-received citation URL while the model is still writing it.
  const markdown = streaming ? content.replace(/\[([^\]]+)\]\([^)]*$/, '$1') : content;
  return <ReactMarkdown rehypePlugins={plugins} components={{
    a: ({ href, children }) => {
      const source = sources.find(s => s.url === href || s.url === `/${href}`);
      return source ? <a href={source.url} target="_blank" rel="noopener noreferrer" title={`Open ${source.kind === 'project' ? 'project' : 'article'} in a new tab`}>{children}</a> : <span>{children}</span>;
    },
    img: () => null,
  }}>{markdown}</ReactMarkdown>;
});
