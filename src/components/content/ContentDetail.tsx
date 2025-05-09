
import React from 'react';
import { ContentEntry } from '@/services/content/contentService';
import { X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import ReactMarkdown from 'react-markdown';

interface ContentDetailProps {
  content: ContentEntry;
  onClose: () => void;
}

const ContentDetail = ({ content, onClose }: ContentDetailProps) => {
  return (
    <div className="flex flex-col h-full w-full bg-background">
      <header className="border-b p-6 flex justify-between items-center">
        <h1 className="text-2xl font-semibold">{content.title}</h1>
        <button 
          onClick={onClose}
          className="rounded-full p-2 hover:bg-muted transition-colors"
          aria-label="Close"
        >
          <X size={24} />
        </button>
      </header>
      
      <ScrollArea className="flex-1 p-6">
        <div className="prose prose-lg max-w-none">
          <ReactMarkdown>{content.content}</ReactMarkdown>
        </div>
      </ScrollArea>

      <footer className="border-t p-4 text-sm text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>Type: {content.type}</span>
          <span>
            {content.created_at && new Date(content.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </span>
        </div>
      </footer>
    </div>
  );
};

export default ContentDetail;
