import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Hero from '@/components/home/Hero';
import FeaturedProject from '@/components/home/FeaturedProject';
import AboutSection from '@/components/home/AboutSection';
import FooterAmbient from '@/components/home/FooterAmbient';

interface FeaturedProjectData {
  id: string;
  title: string;
  client: string;
  description: string;
  imageUrl: string;
  tags: string[];
  liveUrl?: string;
}

const FEATURED_TITLES = [
  'Stash',
  'weOS',
  'Included Health Multimodal AI (Voice, Chat, Video)',
];

const Index = () => {
  const [projects, setProjects] = useState<FeaturedProjectData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select(
            `
            id,
            title,
            client,
            description,
            liveurl,
            project_images (image_url, is_primary),
            project_tags (
              tags (name)
            )
          `
          )
          .in('title', FEATURED_TITLES)
          .eq('visible', true);

        if (error) throw error;

        if (data) {
          const ordered = FEATURED_TITLES.map((title) =>
            data.find((p) => p.title === title)
          ).filter(Boolean);

          const formatted: FeaturedProjectData[] = ordered.map((item: any) => ({
            id: item.id,
            title: item.title,
            client: item.client,
            description: item.description,
            imageUrl:
              item.project_images.find((img: any) => img.is_primary)
                ?.image_url || '/placeholder.svg',
            tags: item.project_tags.map((tag: any) => tag.tags.name),
            liveUrl: item.liveurl || undefined,
          }));

          setProjects(formatted);
        }
      } catch (err) {
        console.error('Error fetching featured projects:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFeatured();
  }, []);

  return (
    <div className="min-h-screen">
      <Hero />

      <div className="relative z-10 bg-background">
        {/* Section heading */}
        <div className="max-w-7xl mx-auto px-6 md:px-12 pt-16 pb-4">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-sans">
            Selected Work
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="w-6 h-6 border border-foreground/20 border-t-foreground/60 rounded-full animate-spin" />
          </div>
        ) : (
          projects.map((project, index) => (
            <FeaturedProject
              key={project.id}
              {...project}
              index={index}
            />
          ))
        )}

        {/* View all projects link */}
        <div className="max-w-7xl mx-auto px-6 md:px-12 pb-24 pt-8">
          <Link
            to="/projects"
            className="inline-flex items-center gap-2 font-sans text-sm text-foreground/60 hover:text-foreground transition-colors no-underline group"
          >
            <span className="border-b border-foreground/20 group-hover:border-foreground/50 pb-0.5 transition-colors">
              View all projects
            </span>
            <span className="text-xs transition-transform group-hover:translate-x-0.5">
              &rarr;
            </span>
          </Link>
        </div>
      </div>

      <AboutSection />

      {/* Footer with ambient animation */}
      <footer className="relative overflow-hidden bg-[#08070b] border-t border-white/5 py-14">
        <FooterAmbient />
        <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 flex justify-between items-center">
          <p className="text-xs text-white/25 font-sans">
            &copy; {new Date().getFullYear()} William Dzierson
          </p>
          <p className="text-xs text-white/25 font-sans">
            Press{' '}
            <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-white/40 font-mono text-[10px]">
              ⌘K
            </kbd>{' '}
            to explore
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
