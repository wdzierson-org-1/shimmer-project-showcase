
import React from 'react';
import ReactMarkdown from 'react-markdown';
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
      <div className="prose max-w-none text-lg">
        <ReactMarkdown>
          {description}
        </ReactMarkdown>
      </div>

      {involvement && (
        <div>
          <h3 className="text-lg font-medium mb-3">My Involvement</h3>
          <div className="text-muted-foreground prose max-w-none">
            <ReactMarkdown>
              {involvement}
            </ReactMarkdown>
          </div>
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
