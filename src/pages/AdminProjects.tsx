import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { arrayMove } from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import SortableProjectList from '@/components/admin/SortableProjectList';
import type { AdminProject } from '@/components/admin/SortableProjectRow';
import { projectOrderUpdates, withProjectOrder } from '@/lib/projectOrder';

export default function AdminProjects() {
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingOrder = useRef(false);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const { data, error } = await withProjectOrder(supabase.from('projects').select(`
        id, title, client, description, display_order, created_at, unlisted,
        project_images (image_url, is_primary), project_tags (tags (name))
      `));
      if (error) throw error;
      setProjects((data || []).map(item => ({
        id: item.id, title: item.title, client: item.client, description: item.description,
        imageUrl: item.project_images.find(img => img.is_primary)?.image_url || '/placeholder.svg',
        tags: item.project_tags.map(tag => tag.tags?.name).filter((name): name is string => !!name),
        displayOrder: item.display_order, createdAt: item.created_at, unlisted: item.unlisted,
      })));
    } catch {
      setLoadError(true);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void fetchProjects(); }, [fetchProjects]);

  async function handleReorder(activeId: string, overId: string) {
    if (savingOrder.current || searchTerm.trim() || activeId === overId) return;
    const from = projects.findIndex(project => project.id === activeId);
    const to = projects.findIndex(project => project.id === overId);
    if (from < 0 || to < 0) return;
    const reordered = arrayMove(projects, from, to);
    const updates = projectOrderUpdates(reordered);
    savingOrder.current = true;
    setSaving(true);
    setProjects(reordered.map((project, index) => ({ ...project, displayOrder: index })));
    try {
      // Wait for every request before allowing another drag or reloading after a failure.
      const results = await Promise.allSettled(updates.map(async ({ id, display_order }) => {
        const { data, error } = await supabase.from('projects').update({ display_order }).eq('id', id).select('id').single();
        if (error || data?.id !== id) throw error || new Error('Order was not saved');
      }));
      if (results.some(result => result.status === 'rejected')) throw new Error('Order was not fully saved');
      toast.success('Project order saved');
    } catch {
      // Read back actual persisted positions instead of displaying an unsaved optimistic order.
      await fetchProjects();
      toast.error('Couldn’t save the full order. Please check the saved positions and try again.');
    } finally {
      savingOrder.current = false;
      setSaving(false);
    }
  }

  async function handleToggleUnlisted(id: string, unlisted: boolean) {
    if (savingOrder.current) return;
    const { data, error } = await supabase.from('projects').update({ unlisted }).eq('id', id).select('id, unlisted').single();
    if (error || data?.unlisted !== unlisted) { toast.error('Couldn’t update the listing setting'); return; }
    setProjects(previous => previous.map(project => project.id === id ? { ...project, unlisted } : project));
    toast.success(unlisted ? 'Project unlisted. It stays reachable by direct link.' : 'Project listed on the site again');
  }

  async function handleDeleteProject(id: string) {
    if (savingOrder.current || !confirm('Are you sure you want to delete this project?')) return;
    try {
      const tables = ['project_embeddings', 'project_images', 'project_tags'] as const;
      for (const table of tables) {
        const { error } = await supabase.from(table).delete().eq('project_id', id);
        if (error) throw error;
      }
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) throw error;
      setProjects(previous => previous.filter(project => project.id !== id));
      toast.success('Project deleted successfully');
    } catch { toast.error('Failed to delete project'); }
  }

  const query = searchTerm.trim().toLowerCase();
  const filtered = projects.filter(project => !query || `${project.title} ${project.client}`.toLowerCase().includes(query));
  return <div className="min-h-screen bg-muted/20"><div className="container mx-auto py-8 px-4">
    <div className="mb-8">
      <Button asChild variant="ghost" className="mb-4"><Link to="/admin/dashboard"><ArrowLeft className="mr-2 h-4 w-4"/> Back to Admin</Link></Button>
      <div className="flex justify-between items-center gap-4"><div><h1 className="text-3xl font-semibold">Projects</h1><p className="mt-2 text-sm text-muted-foreground">Drag to set the order on All work. Changes save automatically.</p></div><Button asChild><Link to="/admin/project/new"><Plus className="mr-2 h-4 w-4"/> Add Project</Link></Button></div>
    </div>
    {loading ? <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto mb-2"/><p className="text-muted-foreground">Loading projects…</p></div>
      : loadError ? <div role="alert" className="p-8 text-center"><p>Couldn’t load the saved project order.</p><Button variant="outline" className="mt-4" onClick={() => void fetchProjects()}>Try again</Button></div>
      : <>
        <div className="flex items-center justify-between gap-4 mb-3">
          <div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4"/><Input aria-label="Search projects" placeholder="Search projects…" className="pl-10 h-9 text-sm" value={searchTerm} onChange={event => setSearchTerm(event.target.value)}/></div>
          <span role="status" className="text-sm text-muted-foreground">{saving ? 'Saving order…' : query ? 'Clear search to reorder' : `${projects.length} projects`}</span>
        </div>
        <div className="bg-card rounded-lg border shadow-sm overflow-x-auto"><div className="min-w-[680px]">
          <div className="grid grid-cols-12 gap-4 p-4 font-medium text-muted-foreground border-b text-xs uppercase tracking-wider"><div className="col-span-5">Project</div><div className="col-span-3">Client</div><div className="col-span-2">Tags</div><div className="col-span-2 text-right">Actions</div></div>
          <SortableProjectList projects={filtered} onReorder={handleReorder} onDelete={handleDeleteProject} onToggleUnlisted={handleToggleUnlisted} disabled={saving} sortingDisabled={!!query}/>
        </div></div>
      </>}
  </div></div>;
}
