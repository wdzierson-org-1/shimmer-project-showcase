
import React from 'react';
import { ContentEntry } from '@/services/content/contentService';
import { ScrollArea } from '@/components/ui/scroll-area';
import ReactMarkdown from 'react-markdown';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Download, X } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card } from '@/components/ui/card';

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
      {/* Header with sans-serif font for title */}
      <header className="border-b p-4 md:p-6 flex justify-between items-center sticky top-0 z-10 bg-background">
        <h1 className="text-xl md:text-2xl font-semibold truncate pr-2 font-sans">{content.title}</h1>
        <button 
          onClick={onClose}
          className="rounded-full p-2 hover:bg-muted flex items-center justify-center focus:outline-none"
        >
          <X size={isMobile ? 18 : 20} />
        </button>
      </header>
      
      {/* Layout with image on left (if exists) and content on right */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4 md:p-6">
            <div className={`flex flex-col ${!isMobile ? 'md:flex-row md:gap-6' : ''}`}>
              {/* Image section - on left for desktop, top for mobile */}
              {content.image_url && (
                <div className={`${isMobile ? 'mb-4' : 'md:w-2/5 lg:w-1/3'} flex-shrink-0`}>
                  <div className="sticky top-4">
                    <img 
                      src={content.image_url} 
                      alt={content.title} 
                      className="rounded-xl w-full h-auto object-cover"
                      style={{ borderRadius: '12px' }}
                    />
                  </div>
                </div>
              )}

              {/* Content section - on right for desktop, below for mobile */}
              <div className={`${content.image_url ? (isMobile ? 'w-full' : 'md:flex-1') : 'w-full'}`}>
                <div className="prose prose-sm md:prose-base lg:prose-lg max-w-none">
                  <div className="whitespace-pre-wrap">
                    <ReactMarkdown>{processContent(content.content)}</ReactMarkdown>
                  </div>
                
                  {/* Display link previews - improved for mobile */}
                  {urls.length > 0 && (
                    <div className="mt-6 space-y-3">
                      <h3 className="text-sm md:text-base font-medium mb-2">Links</h3>
                      <div className="grid gap-3 md:grid-cols-2">
                        {urls.map((url, index) => (
                          <Card 
                            key={index} 
                            className="hover:border-primary/50 transition-colors cursor-pointer"
                            onClick={() => window.open(url, '_blank')}
                          >
                            <div className="p-3 md:p-4">
                              <div className="flex items-start space-x-2">
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-medium text-sm md:text-base truncate">{url}</h3>
                                  <p className="text-xs md:text-sm text-muted-foreground truncate mt-1">
                                    {new URL(url).hostname}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Display file attachment with download icon */}
                  {content.file_url && (
                    <div className="mt-6 border rounded-md p-3 md:p-4">
                      <a 
                        href={content.file_url} 
                        download 
                        className="flex items-center text-primary hover:underline text-sm md:text-base group"
                      >
                        <Download size={18} className="mr-2 group-hover:text-primary" />
                        Download attached file
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>

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
