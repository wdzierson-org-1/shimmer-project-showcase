
import React from 'react';
import { ContentEntry } from '@/services/content/contentService';
import { ScrollArea } from '@/components/ui/scroll-area';
import ReactMarkdown from 'react-markdown';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface ContentDetailProps {
  content: ContentEntry;
  onClose: () => void;
}

const ContentDetail = ({ content, onClose }: ContentDetailProps) => {
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
      <header className="border-b p-6 flex justify-between items-center">
        <h1 className="text-2xl font-semibold">{content.title}</h1>
      </header>
      
      <ScrollArea className="flex-1 p-6">
        <div className="prose prose-lg max-w-none">
          {/* Fix: ReactMarkdown doesn't accept className directly */}
          <div className="whitespace-pre-wrap">
            <ReactMarkdown>{processContent(content.content)}</ReactMarkdown>
          </div>
          
          {/* Display any images if they're attached to the content */}
          {content.image_url && (
            <div className="my-6">
              <img 
                src={content.image_url} 
                alt={content.title} 
                className="rounded-md max-h-96 w-auto mx-auto"
              />
            </div>
          )}
          
          {/* Display link previews */}
          {urls.length > 0 && (
            <div className="mt-8 space-y-4">
              {urls.map((url, index) => (
                <div 
                  key={index} 
                  className="border rounded-md p-4 hover:border-primary/50 transition-colors"
                  onClick={() => window.open(url, '_blank')}
                >
                  <div className="flex items-start space-x-4">
                    <div className="flex-1">
                      <h3 className="font-medium truncate">{url}</h3>
                      <p className="text-sm text-muted-foreground truncate mt-1">
                        {new URL(url).hostname}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Display file attachments */}
          {content.file_url && (
            <div className="mt-6 border rounded-md p-4">
              <a 
                href={content.file_url} 
                download 
                className="flex items-center text-primary hover:underline"
              >
                Download attached file
              </a>
            </div>
          )}
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
