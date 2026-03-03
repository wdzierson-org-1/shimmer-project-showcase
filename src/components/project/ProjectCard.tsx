
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';

export interface Project {
  id: string;
  title: string;
  client: string;
  description: string;
  imageUrl: string;
  additionalImages?: string[];
  tags: string[];
  createdAt: string;
  year?: number;
  involvement?: string;
  liveUrl?: string;
}

interface ProjectCardProps {
  project: Project;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
  return (
    <Link to={`/project/${project.id}`} className="group block">
      <div className="overflow-hidden bg-muted/20 aspect-[4/3] rounded-md mb-4">
        <img 
          src={project.imageUrl} 
          alt={project.title} 
          loading="lazy"
          className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div className="pt-2">
        <div className="text-xs uppercase text-muted-foreground mb-1">
          {project.client}
        </div>
        <h3 className="text-xl font-medium">{project.title}</h3>
        <div className="flex flex-wrap mt-2 gap-1">
          {project.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary" className="mr-1">
              {tag}
            </Badge>
          ))}
          {project.tags.length > 3 && (
            <Badge variant="outline">+{project.tags.length - 3}</Badge>
          )}
        </div>
      </div>
    </Link>
  );
};

export default ProjectCard;
