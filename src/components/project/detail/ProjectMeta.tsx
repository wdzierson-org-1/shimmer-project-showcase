
import React from 'react';
import { Badge } from '@/components/ui/badge';

interface ProjectMetaProps {
  client: string;
  title: string;
  tags: string[];
  year?: number;
}

const ProjectMeta: React.FC<ProjectMetaProps> = ({ client, title, tags, year }) => {
  return (
    <div className="mb-8">
      <div className="text-sm uppercase text-muted-foreground mb-1">
        {client}{year ? <span className="text-muted-foreground/60"> · {year}</span> : null}
      </div>
      <h1 className="case-study-title mb-6">{title}</h1>
      <div className="flex flex-wrap gap-1 mb-8">
        {tags.map((tag) => (
          <Badge key={tag} variant="secondary" className="bg-gray-200 text-gray-700 hover:bg-gray-300">
            {tag}
          </Badge>
        ))}
      </div>
    </div>
  );
};

export default ProjectMeta;
