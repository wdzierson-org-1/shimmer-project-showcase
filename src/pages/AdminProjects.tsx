
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Edit, Trash2, ArrowLeft, Loader2, GripVertical } from 'lucide-react';
import { Project } from '@/components/project/ProjectCard';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableRowProps {
  project: Project;
  onDelete: (id: string) => void;
}

const SortableRow: React.FC<SortableRowProps> = ({ project, onDelete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    position: isDragging ? 'relative' as const : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`grid grid-cols-12 gap-4 p-4 items-center ${isDragging ? 'bg-accent shadow-lg rounded-lg' : ''}`}
    >
      <div className="col-span-1 flex justify-center">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground touch-none"
        >
          <GripVertical className="h-5 w-5" />
        </button>
      </div>
      <div className="col-span-4 flex items-center gap-4">
        <div className="w-16 h-12 bg-muted rounded overflow-hidden flex-shrink-0">
          <img
            src={project.imageUrl}
            alt={project.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/placeholder.svg';
            }}
          />
        </div>
        <div>
          <h3 className="font-medium">{project.title}</h3>
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
          {project.tags.slice(0, 2).map(tag => (
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

const AdminProjects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);

        const { data, error } = await supabase
          .from('projects')
          .select(`
            id,
            title,
            client,
            description,
            created_at,
            sort_order,
            project_images (image_url, is_primary),
            project_tags (
              tags (name)
            )
          `)
          .order('sort_order', { ascending: true, nullsFirst: false })
          .order('updated_at', { ascending: false });

        if (error) throw error;

        if (data) {
          const formattedProjects: Project[] = data.map(item => ({
            id: item.id,
            title: item.title,
            client: item.client,
            description: item.description,
            imageUrl: item.project_images.find((img: any) => img.is_primary)?.image_url || '/placeholder.svg',
            tags: item.project_tags.map((tag: any) => tag.tags.name),
            createdAt: item.created_at
          }));

          setProjects(formattedProjects);
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
        toast.error('Failed to load projects');
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  const filteredProjects = projects.filter(project =>
    project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.client.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isFiltering = searchTerm.length > 0;

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = projects.findIndex(p => p.id === active.id);
    const newIndex = projects.findIndex(p => p.id === over.id);
    const reordered = arrayMove(projects, oldIndex, newIndex);
    setProjects(reordered);

    try {
      const updates = reordered.map((project, index) => ({
        id: project.id,
        sort_order: index,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('projects')
          .update({ sort_order: update.sort_order })
          .eq('id', update.id);

        if (error) throw error;
      }

      toast.success('Project order updated');
    } catch (error) {
      console.error('Error updating project order:', error);
      toast.error('Failed to update project order');
    }
  }, [projects]);

  const handleDeleteProject = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      const { error: embeddingsError } = await supabase
        .from('project_embeddings')
        .delete()
        .eq('project_id', id);
      if (embeddingsError) throw embeddingsError;

      const { error: imagesError } = await supabase
        .from('project_images')
        .delete()
        .eq('project_id', id);
      if (imagesError) throw imagesError;

      const { error: tagsError } = await supabase
        .from('project_tags')
        .delete()
        .eq('project_id', id);
      if (tagsError) throw tagsError;

      const { error: projectError } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);
      if (projectError) throw projectError;

      setProjects(projects.filter(project => project.id !== id));
      toast.success('Project deleted successfully');
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error('Failed to delete project');
    }
  };

  return (
    <div className="min-h-screen bg-muted/20">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <Button asChild variant="ghost" className="mb-4">
            <Link to="/admin">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Admin
            </Link>
          </Button>
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-semibold">Projects</h1>
            <Button asChild>
              <Link to="/admin/project/new">
                <Plus className="mr-2 h-4 w-4" /> Add Project
              </Link>
            </Button>
          </div>
        </div>

        <div className="relative mb-8">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search projects..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="bg-card rounded-lg border shadow-sm">
          <div className="grid grid-cols-12 gap-4 p-4 font-medium text-muted-foreground border-b">
            <div className="col-span-1"></div>
            <div className="col-span-4">PROJECT</div>
            <div className="col-span-3">CLIENT</div>
            <div className="col-span-2">TAGS</div>
            <div className="col-span-2 text-right">ACTIONS</div>
          </div>

          <div className="divide-y">
            {loading ? (
              <div className="p-8 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                <p className="text-muted-foreground">Loading projects...</p>
              </div>
            ) : filteredProjects.length > 0 ? (
              isFiltering ? (
                filteredProjects.map(project => (
                  <SortableRow key={project.id} project={project} onDelete={handleDeleteProject} />
                ))
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={filteredProjects.map(p => p.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {filteredProjects.map(project => (
                      <SortableRow key={project.id} project={project} onDelete={handleDeleteProject} />
                    ))}
                  </SortableContext>
                </DndContext>
              )
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                No projects found.
              </div>
            )}
          </div>
        </div>

        {!isFiltering && (
          <p className="text-sm text-muted-foreground mt-4">
            Drag rows to reorder projects. This order is reflected on the projects page and homepage.
          </p>
        )}
      </div>
    </div>
  );
};

export default AdminProjects;
