import React from 'react';
import { Link } from 'react-router-dom';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GripVertical, Edit, Trash2, Star } from 'lucide-react';

export interface AdminProject {
  id: string;
  title: string;
  client: string;
  description: string;
  imageUrl: string;
  tags: string[];
  featured: boolean;
  displayOrder: number;
  createdAt: string | null;
}

interface SortableProjectRowProps {
  project: AdminProject;
  onDelete: (id: string) => void;
}

const SortableProjectRow = ({ project, onDelete }: SortableProjectRowProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`grid grid-cols-12 gap-4 p-4 items-center group ${
        isDragging ? 'opacity-50 bg-muted/50 z-10 relative shadow-lg rounded' : ''
      }`}
    >
      <div className="col-span-5 flex items-center gap-3">
        <div
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing flex-shrink-0 p-0.5 -ml-2 text-muted-foreground hover:text-foreground"
        >
          <GripVertical className="h-4 w-4" />
        </div>
        <div className="w-16 h-12 bg-muted rounded overflow-hidden flex-shrink-0">
          <img
            src={project.imageUrl}
            alt={project.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/placeholder.svg';
            }}
          />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="font-medium truncate">{project.title}</h3>
            {project.featured && (
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 flex-shrink-0" />
            )}
          </div>
          <p className="text-sm text-muted-foreground line-clamp-1">
            {project.description}
          </p>
        </div>
      </div>
      <div className="col-span-3">
        <span className="text-sm">{project.client}</span>
      </div>
      <div className="col-span-2">
        <div className="flex flex-wrap gap-1">
          {project.tags.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
          {project.tags.length > 2 && (
            <Badge variant="outline" className="text-xs">
              +{project.tags.length - 2}
            </Badge>
          )}
        </div>
      </div>
      <div className="col-span-2 flex gap-2 justify-end">
        <Button variant="ghost" size="icon" asChild>
          <Link to={`/admin/project/${project.id}`}>
            <Edit className="h-4 w-4" />
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive"
          onClick={() => onDelete(project.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default SortableProjectRow;
