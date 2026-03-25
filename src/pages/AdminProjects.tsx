import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { arrayMove } from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, ArrowLeft, Loader2, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import SortableProjectList from '@/components/admin/SortableProjectList';
import type { AdminProject } from '@/components/admin/SortableProjectRow';

const AdminProjects = () => {
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

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
            featured,
            display_order,
            created_at,
            project_images (image_url, is_primary),
            project_tags (
              tags (name)
            )
          `)
          .order('display_order', { ascending: true });

        if (error) throw error;

        if (data) {
          const formatted: AdminProject[] = data.map((item) => ({
            id: item.id,
            title: item.title,
            client: item.client,
            description: item.description,
            imageUrl:
              item.project_images.find((img: any) => img.is_primary)
                ?.image_url || '/placeholder.svg',
            tags: item.project_tags.map((tag: any) => tag.tags.name),
            featured: item.featured ?? false,
            displayOrder: item.display_order ?? 0,
            createdAt: item.created_at,
          }));

          setProjects(formatted);
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

  const featuredProjects = projects.filter((p) => p.featured);
  const regularProjects = projects.filter((p) => !p.featured);

  const filteredRegular = searchTerm
    ? regularProjects.filter(
        (p) =>
          p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.client.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : regularProjects;

  const persistOrder = useCallback(
    async (reordered: AdminProject[]) => {
      const updates = reordered.map((p, index) => ({
        id: p.id,
        display_order: index,
      }));

      const promises = updates.map(({ id, display_order }) =>
        supabase
          .from('projects')
          .update({ display_order })
          .eq('id', id)
      );

      const results = await Promise.all(promises);
      const failed = results.find((r) => r.error);
      if (failed?.error) {
        console.error('Error persisting order:', failed.error);
        toast.error('Failed to save new order');
      }
    },
    []
  );

  const handleReorderFeatured = useCallback(
    (activeId: string, overId: string) => {
      setProjects((prev) => {
        const featured = prev.filter((p) => p.featured);
        const rest = prev.filter((p) => !p.featured);

        const oldIndex = featured.findIndex((p) => p.id === activeId);
        const newIndex = featured.findIndex((p) => p.id === overId);
        const reordered = arrayMove(featured, oldIndex, newIndex);

        persistOrder(reordered);
        return [...reordered, ...rest];
      });
    },
    [persistOrder]
  );

  const handleReorderRegular = useCallback(
    (activeId: string, overId: string) => {
      setProjects((prev) => {
        const featured = prev.filter((p) => p.featured);
        const rest = prev.filter((p) => !p.featured);

        const oldIndex = rest.findIndex((p) => p.id === activeId);
        const newIndex = rest.findIndex((p) => p.id === overId);
        const reordered = arrayMove(rest, oldIndex, newIndex);

        persistOrder(reordered);
        return [...featured, ...reordered];
      });
    },
    [persistOrder]
  );

  const handleDeleteProject = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      const tables = ['project_embeddings', 'project_images', 'project_tags'] as const;
      for (const table of tables) {
        const { error } = await supabase.from(table).delete().eq('project_id', id);
        if (error) throw error;
      }

      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) throw error;

      setProjects((prev) => prev.filter((p) => p.id !== id));
      toast.success('Project deleted successfully');
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error('Failed to delete project');
    }
  };

  const columnHeader = (
    <div className="grid grid-cols-12 gap-4 p-4 font-medium text-muted-foreground border-b text-xs uppercase tracking-wider">
      <div className="col-span-5">Project</div>
      <div className="col-span-3">Client</div>
      <div className="col-span-2">Tags</div>
      <div className="col-span-2 text-right">Actions</div>
    </div>
  );

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

        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
            <p className="text-muted-foreground">Loading projects...</p>
          </div>
        ) : (
          <>
            {/* Featured section */}
            {featuredProjects.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Featured on Homepage
                  </h2>
                  <span className="text-xs text-muted-foreground/60">
                    — drag to reorder
                  </span>
                </div>
                <div className="bg-card rounded-lg border shadow-sm">
                  {columnHeader}
                  <SortableProjectList
                    projects={featuredProjects}
                    onReorder={handleReorderFeatured}
                    onDelete={handleDeleteProject}
                  />
                </div>
              </div>
            )}

            {/* All projects section */}
            <div>
              <div className="flex items-center gap-4 mb-3">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  All Projects
                </h2>
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search projects..."
                    className="pl-10 h-8 text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="bg-card rounded-lg border shadow-sm">
                {columnHeader}
                {searchTerm ? (
                  <div className="divide-y">
                    {filteredRegular.length > 0 ? (
                      filteredRegular.map((project) => (
                        <div
                          key={project.id}
                          className="grid grid-cols-12 gap-4 p-4 items-center"
                        >
                          <div className="col-span-5 flex items-center gap-3 pl-6">
                            <div className="w-16 h-12 bg-muted rounded overflow-hidden flex-shrink-0">
                              <img
                                src={project.imageUrl}
                                alt={project.title}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src =
                                    '/placeholder.svg';
                                }}
                              />
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-medium truncate">
                                {project.title}
                              </h3>
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
                                <span
                                  key={tag}
                                  className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs"
                                >
                                  {tag}
                                </span>
                              ))}
                              {project.tags.length > 2 && (
                                <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs">
                                  +{project.tags.length - 2}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="col-span-2 flex gap-2 justify-end">
                            <Button variant="ghost" size="icon" asChild>
                              <Link to={`/admin/project/${project.id}`}>
                                <svg
                                  className="h-4 w-4"
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                  <path d="m15 5 4 4" />
                                </svg>
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => handleDeleteProject(project.id)}
                            >
                              <svg
                                className="h-4 w-4"
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M3 6h18" />
                                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                              </svg>
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-muted-foreground">
                        No projects match your search.
                      </div>
                    )}
                  </div>
                ) : (
                  <SortableProjectList
                    projects={regularProjects}
                    onReorder={handleReorderRegular}
                    onDelete={handleDeleteProject}
                  />
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminProjects;
