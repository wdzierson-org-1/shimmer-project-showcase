
import React from 'react';
import { Project } from '@/components/project/ProjectCard';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ProjectThumbnailsProps {
  projects: Project[];
  onSelect: (project: Project) => void;
}

const ProjectThumbnails: React.FC<ProjectThumbnailsProps> = ({ projects, onSelect }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
      {projects.map((project) => (
        <div 
          key={project.id}
          className={cn(
            "overflow-hidden cursor-pointer transition-all rounded-lg",
            "group bg-white border border-gray-100 shadow-sm hover:shadow-md"
          )}
          onClick={() => onSelect(project)}
        >
          <div className="aspect-[16/9] w-full overflow-hidden rounded-t-lg mb-3">
            <img 
              src={project.imageUrl} 
              alt={project.title} 
              loading="lazy"
              className={cn(
                "h-full w-full object-cover",
                "transition-transform duration-700 group-hover:scale-105"
              )}
            />
          </div>
          <div className="p-3">
            <h3 className="text-base text-foreground font-serif" style={{ fontWeight: 200 }}>{project.title}</h3>
            <p className="text-xs text-muted-foreground mt-1">{project.client}</p>
            <div className="flex flex-wrap gap-1 mt-2">
              {project.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs px-1.5 py-0.5 text-[10px]">
                  {tag}
                </Badge>
              ))}
              {project.tags.length > 3 && (
                <span className="text-[10px] text-muted-foreground">+{project.tags.length - 3}</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProjectThumbnails;
