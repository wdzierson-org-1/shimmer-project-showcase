import React, { useState, useEffect } from 'react';
import ProjectCard, { Project } from './ProjectCard';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface ProjectGridProps {
  projects?: Project[];
  limit?: number;
}

const ProjectGrid: React.FC<ProjectGridProps> = ({ projects: providedProjects, limit }) => {
  const [projects, setProjects] = useState<Project[]>(providedProjects || []);
  const [loading, setLoading] = useState(!providedProjects);

  useEffect(() => {
    // If projects are provided as props, use them
    if (providedProjects) {
      setProjects(providedProjects);
      setLoading(false);
      return;
    }

    // Otherwise fetch from Supabase
    const fetchProjects = async () => {
      try {
        let query = supabase
          .from('projects')
          .select(`
            id,
            title,
            client,
            description,
            created_at,
            project_images (image_url, is_primary),
            project_tags (
              tags (name)
            )
          `)
          .eq('visible', true)
          .order('sort_order', { ascending: true, nullsFirst: false })
          .order('created_at', { ascending: false });
          
        if (limit) {
          query = query.limit(limit);
        }
        
        const { data, error } = await query;
        
        if (error) {
          throw error;
        }
        
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
      } finally {
        setLoading(false);
      }
    };
    
    fetchProjects();
  }, [providedProjects, limit]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  );
};

export default ProjectGrid;
