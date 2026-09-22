
import React, { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import HomeFeaturedProjects from '@/components/home/HomeFeaturedProjects';
import ProjectGrid from '@/components/project/ProjectGrid';
import ScrollNav from '@/components/home/ScrollNav';
import { Project } from '@/components/project/ProjectCard';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

const AllProjects = () => {
  const [allProjects, setAllProjects] = useState<Project[]>([]);
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
            created_at,
            year,
            project_images (image_url, is_primary),
            project_tags (
              tags (name)
            )
          `)
          .eq('visible', true)
          .order('year', { ascending: false, nullsFirst: false })
          .order('sort_order', { ascending: true, nullsFirst: false });

        if (error) throw error;

        if (data) {
          const formatted: Project[] = data.map(item => ({
            id: item.id,
            title: item.title,
            client: item.client,
            description: item.description,
            imageUrl: item.project_images.find((img: any) => img.is_primary)?.image_url || '/placeholder.svg',
            tags: item.project_tags.map((tag: any) => tag.tags.name),
            createdAt: item.created_at,
            year: item.year,
          }));
          setAllProjects(formatted);
        }
      } catch (err) {
        console.error('Error fetching projects:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <ScrollNav />

      <main className="flex-1 pt-24 pb-12">
        {/* Featured work — top 4 by sort_order */}
        <div className="mb-16">
          <div className="container mx-auto px-4 md:px-6 mb-8">
            <h2 className="text-xs uppercase tracking-widest text-muted-foreground">Featured Work</h2>
          </div>
          <HomeFeaturedProjects />
        </div>

        {/* All work — sorted by year desc */}
        <div className="container mx-auto px-4 md:px-6">
          <div className="mb-8 border-t pt-12">
            <h2 className="text-xs uppercase tracking-widest text-muted-foreground">All Work</h2>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ProjectGrid projects={allProjects} />
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AllProjects;
