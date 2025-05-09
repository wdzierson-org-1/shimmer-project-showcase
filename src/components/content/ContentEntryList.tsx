
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
  return (
    <div className="space-y-4">
      {contentEntries.map((content) => (
        <Card key={content.id} className="overflow-hidden hover:border-primary/50 transition-colors">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="text-xl font-medium mb-2">{content.title}</h3>
                <p className="text-muted-foreground line-clamp-2">
                  {content.content.substring(0, 120)}
                  {content.content.length > 120 ? "..." : ""}
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="ml-4 mt-1"
                onClick={() => onSelect(content)}
              >
                Read <ArrowRight className="ml-1" size={16} />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ContentEntryList;
