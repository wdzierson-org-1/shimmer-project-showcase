import React from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// Configure marked for better rendering
marked.setOptions({
  breaks: true,
  gfm: true,
});

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ 
  content, 
  className = '' 
}) => {
  const htmlContent = React.useMemo(() => {
    const rawHtml = marked(content) as string;
    return DOMPurify.sanitize(rawHtml);
  }, [content]);

  return (
    <div 
      className={`prose prose-gray max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
};

export default MarkdownRenderer;