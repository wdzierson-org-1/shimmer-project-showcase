
import React from 'react';
import { ContentEntry } from '@/services/content/contentService';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

interface ContentEntryListProps {
  contentEntries: ContentEntry[];
  onSelect: (content: ContentEntry) => void;
}

const ContentEntryList = ({ contentEntries, onSelect }: ContentEntryListProps) => {
  console.log('ContentEntryList rendered with:', { 
    entriesCount: contentEntries.length, 
    hasOnSelect: !!onSelect,
    entries: contentEntries.map(entry => ({ id: entry.id, title: entry.title }))
  });

  // Function to extract the first URL from content
  const extractFirstUrl = (text: string): string | null => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = text.match(urlRegex);
    return urls && urls.length > 0 ? urls[0] : null;
  };

  return (
    <div className="space-y-4">
      {contentEntries.map((content, index) => {
        console.log(`Rendering entry ${index}:`, { 
          id: content.id, 
          title: content.title,
          hasOnSelect: !!onSelect 
        });
        
        return (
          <Card key={content.id} className="overflow-hidden hover:border-primary/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-xl font-medium mb-2">{content.title}</h3>
                  <p className="text-muted-foreground line-clamp-2">
                    {content.content.substring(0, 120)}
                    {content.content.length > 120 ? "..." : ""}
                  </p>
                  
                  {/* Display first link as a preview if exists */}
                  {extractFirstUrl(content.content) && (
                    <div className="mt-2 border-l-4 border-muted pl-3 py-1">
                      <p className="text-sm text-muted-foreground truncate">
                        {extractFirstUrl(content.content)}
                      </p>
                    </div>
                  )}
                  
                  {/* Show image thumbnail if one exists */}
                  {content.image_url && (
                    <div className="mt-3">
                      <img 
                        src={content.image_url} 
                        alt={content.title}
                        className="h-16 w-auto object-cover rounded"
                      />
                    </div>
                  )}
                </div>
                {onSelect && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="ml-4 mt-1"
                    onClick={() => {
                      console.log('Read button clicked for:', content.title);
                      onSelect(content);
                    }}
                  >
                    Read <ArrowRight className="ml-1" size={16} />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default ContentEntryList;
