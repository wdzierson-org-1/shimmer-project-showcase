import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/layout/Header';
import Hero from '@/components/home/Hero';
import FeaturedProject from '@/components/home/FeaturedProject';
import AboutSection from '@/components/home/AboutSection';
import FooterPlayground from '@/components/home/FooterPlayground';
import IslandGameModal from '@/components/home/IslandGameModal';

interface FeaturedProjectData {
  id: string;
  title: string;
  client: string;
  description: string;
  imageUrl: string;
  tags: string[];
  liveUrl?: string;
}

const Index = () => {
  const [projects, setProjects] = useState<FeaturedProjectData[]>([]);
  const [loading, setLoading] = useState(true);
  const [gameOpen, setGameOpen] = useState(false);

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
          .eq('featured', true)
          .eq('visible', true)
          .eq('unlisted', false)
          .order('display_order', { ascending: true });

        if (error) throw error;

        if (data) {
          const formatted: FeaturedProjectData[] = data.map((item: any) => ({
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
      <Header />
      <div className="hidden md:block">
        <Hero />
      </div>

      <div className="relative z-10 bg-background" style={{ boxShadow: '0 -6px 24px 0 rgba(0,0,0,0.10)' }}>
        {/* Section heading */}
        <div className="max-w-7xl mx-auto px-6 md:px-12 pt-20 md:pt-16 pb-2">
          <p
            className="text-muted-foreground font-sans"
            style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.22em', textTransform: 'uppercase' }}
          >
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
              All projects
            </span>
            <span className="text-xs transition-transform group-hover:translate-x-0.5">
              &rarr;
            </span>
          </Link>
        </div>
      </div>

      <AboutSection />

      {/* Footer playground */}
      <footer className="relative bg-[#08070b] border-t border-white/5" style={{ overflow: 'visible' }}>
        <FooterPlayground onHoleFall={() => setGameOpen(true)} gameOpen={gameOpen} />
      </footer>

      <IslandGameModal open={gameOpen} onClose={() => setGameOpen(false)} />
    </div>
  );
};

export default Index;
