
import React from 'react';
import MarkdownRenderer from '@/utils/markdownRenderer';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

interface ProjectDescriptionProps {
  description: string;
  involvement?: string;
  liveUrl?: string;
}

const ProjectDescription: React.FC<ProjectDescriptionProps> = ({ 
  description,
  involvement,
  liveUrl
}) => {
  return (
    <div className="space-y-8">
      <MarkdownRenderer 
        content={description}
        className="text-lg"
      />

      {involvement && (
        <div>
          <h3 className="text-lg font-medium mb-3">My Involvement</h3>
          <MarkdownRenderer 
            content={involvement}
            className="text-muted-foreground"
          />
        </div>
      )}
      
      {liveUrl && (
        <div>
          <h3 className="text-lg font-medium mb-3">Live Version</h3>
          <Button variant="outline" className="flex items-center gap-2" asChild>
            <a href={liveUrl} target="_blank" rel="noopener noreferrer">
              Visit Live Site <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
      )}
    </div>
  );
};

export default ProjectDescription;
