
import React from 'react';
import { ContentEntry } from '@/services/content/contentService';
import { ScrollArea } from '@/components/ui/scroll-area';
import ReactMarkdown from 'react-markdown';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { X } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface ContentDetailProps {
  content: ContentEntry;
  onClose: () => void;
}

const ContentDetail = ({ content, onClose }: ContentDetailProps) => {
  const isMobile = useIsMobile();
  
  // Function to process content and create link previews
  const processContent = (content: string) => {
    // Ensure proper paragraph spacing
    const withProperSpacing = content.replace(/\n/g, '\n\n');
    return withProperSpacing;
  };

  // Extract URLs from content to potentially display as link previews
  const extractUrls = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.match(urlRegex) || [];
  };

  const urls = extractUrls(content.content);

  return (
    <div className="flex flex-col h-full w-full bg-background">
      <header className="border-b p-4 md:p-6 flex justify-between items-center sticky top-0 z-10 bg-background">
        <h1 className="text-xl md:text-2xl font-semibold truncate pr-2">{content.title}</h1>
        {/* Close button with no border */}
        <button 
          onClick={onClose}
          className="rounded-full p-2 hover:bg-muted flex items-center justify-center focus:outline-none"
        >
          <X size={isMobile ? 18 : 20} />
        </button>
      </header>
      
      <ScrollArea className="flex-1 p-4 md:p-6 overflow-auto">
        <div className="prose prose-sm md:prose-lg max-w-none">
          {/* Fix: ReactMarkdown doesn't accept className directly */}
          <div className="whitespace-pre-wrap">
            <ReactMarkdown>{processContent(content.content)}</ReactMarkdown>
          </div>
          
          {/* Display any images if they're attached to the content - better responsive handling */}
          {content.image_url && (
            <div className="my-4 md:my-6">
              <img 
                src={content.image_url} 
                alt={content.title} 
                className="rounded-md max-h-64 md:max-h-96 w-auto mx-auto object-contain"
              />
            </div>
          )}
          
          {/* Display link previews - improved for mobile */}
          {urls.length > 0 && (
            <div className="mt-6 md:mt-8 space-y-3">
              <h3 className="text-sm md:text-base font-medium mb-2">Links</h3>
              {urls.map((url, index) => (
                <div 
                  key={index} 
                  className="border rounded-md p-3 hover:border-primary/50 transition-colors"
                  onClick={() => window.open(url, '_blank')}
                >
                  <div className="flex items-start space-x-2 md:space-x-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm md:text-base truncate">{url}</h3>
                      <p className="text-xs md:text-sm text-muted-foreground truncate mt-1">
                        {new URL(url).hostname}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Display file attachments - improved for mobile */}
          {content.file_url && (
            <div className="mt-4 md:mt-6 border rounded-md p-3 md:p-4">
              <a 
                href={content.file_url} 
                download 
                className="flex items-center text-primary hover:underline text-sm md:text-base"
              >
                Download attached file
              </a>
            </div>
          )}
        </div>
      </ScrollArea>

      <footer className="border-t p-3 md:p-4 text-xs md:text-sm text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>Type: {content.type}</span>
          <span className="truncate pl-4">
            {content.created_at && new Date(content.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })}
          </span>
        </div>
      </footer>
    </div>
  );
};

export default ContentDetail;
