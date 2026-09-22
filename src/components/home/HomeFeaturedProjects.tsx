import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface FeaturedProject {
  id: string;
  title: string;
  client: string;
  description: string;
  imageUrl: string;
  tags: string[];
}

const HomeFeaturedProjects: React.FC = () => {
  const [projects, setProjects] = useState<FeaturedProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select(`
            id,
            title,
            client,
            description,
            project_images (image_url, is_primary),
            project_tags (
              tags (name)
            )
          `)
          .eq('visible', true)
          .order('sort_order', { ascending: true, nullsFirst: false })
          .order('created_at', { ascending: false })
          .limit(4);

        if (error) throw error;

        if (data) {
          const formatted: FeaturedProject[] = data.map(item => ({
            id: item.id,
            title: item.title,
            client: item.client,
            description: item.description,
            imageUrl: item.project_images.find((img: any) => img.is_primary)?.image_url || '/placeholder.svg',
            tags: item.project_tags.map((tag: any) => tag.tags.name),
          }));
          setProjects(formatted);
        }
      } catch (error) {
        console.error('Error fetching featured projects:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (projects.length === 0) return null;

  const [hero, ...rest] = projects;

  return (
    <section className="container mx-auto px-4 md:px-6 lg:px-12">
      {/* Hero project */}
      <Link to={`/project/${hero.id}`} className="group block mb-8">
        <div className="overflow-hidden rounded-lg aspect-[16/9] bg-muted/20">
          <img
            src={hero.imageUrl}
            alt={hero.title}
            className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.03]"
          />
        </div>
        <div className="mt-4 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">{hero.client}</p>
            <h3 className="text-2xl md:text-3xl font-serif tracking-tight" style={{ fontWeight: 300 }}>
              {hero.title}
            </h3>
          </div>
          <div className="flex flex-wrap gap-1">
            {hero.tags.slice(0, 4).map(tag => (
              <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
            ))}
          </div>
        </div>
      </Link>

      {/* Remaining projects */}
      {rest.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {rest.map(project => (
            <Link key={project.id} to={`/project/${project.id}`} className="group block">
              <div className="overflow-hidden rounded-lg aspect-[4/3] bg-muted/20">
                <img
                  src={project.imageUrl}
                  alt={project.title}
                  className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.03]"
                />
              </div>
              <div className="mt-3">
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">{project.client}</p>
                <h3 className="text-lg font-serif tracking-tight" style={{ fontWeight: 300 }}>
                  {project.title}
                </h3>
                <div className="flex flex-wrap gap-1 mt-2">
                  {project.tags.slice(0, 3).map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
};

export default HomeFeaturedProjects;
