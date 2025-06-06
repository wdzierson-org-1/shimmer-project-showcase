
import React from 'react';
import { ContentEntry } from '@/services/content/contentService';
import ReactMarkdown from 'react-markdown';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { layoutStyles, textStyles, spacing, combineStyles } from '@/lib/styles';

interface ContentDetailProps {
  content: ContentEntry;
  onClose: () => void;
}

const ContentDetail = ({ content, onClose }: ContentDetailProps) => {
  const processContent = (content: string) => {
    const withProperSpacing = content.replace(/\n/g, '\n\n');
    return withProperSpacing;
  };

  const extractUrls = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.match(urlRegex) || [];
  };

  const urls = extractUrls(content.content);

  return (
    <div className="h-full flex flex-col overflow-y-auto bg-background">
      <div className="flex-grow px-6 pb-12 pt-6">
        <div className="max-w-7xl mx-auto w-full">
          <h1 className={combineStyles(textStyles.heading, "mb-6")}>{content.title}</h1>
          
          <div className={layoutStyles.gridResponsive}>
            {content.image_url && (
              <div className="space-y-6">
                <img 
                  src={content.image_url} 
                  alt={content.title} 
                  className="w-full h-auto object-cover rounded-xl"
                  style={{ borderRadius: '12px' }}
                />
              </div>
            )}

            <div className={content.image_url ? '' : 'col-span-2'}>
              <div className="prose prose-sm md:prose-base lg:prose-lg max-w-none">
                <div className="whitespace-pre-wrap">
                  <ReactMarkdown>{processContent(content.content)}</ReactMarkdown>
                </div>
                
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
                
                {urls.length > 0 && (
                  <div className="mt-6 space-y-3">
                    <h3 className={combineStyles(textStyles.body, "font-medium mb-2")}>Links</h3>
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
                                <h3 className={combineStyles(textStyles.body, "font-medium truncate")}>{url}</h3>
                                <p className={combineStyles(textStyles.small, "truncate mt-1")}>
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
              </div>
            </div>
          </div>

          <div className={combineStyles("mt-8 pt-4 border-t", textStyles.small)}>
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentDetail;
