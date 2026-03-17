import { useEffect, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';
import type { VillaBook as VillaBookData } from '@/lib/villaBooks';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface ProjectPage {
  type: 'project';
  id: string;
  title: string;
  description: string;
  involvement: string | null;
  year: number;
  tags: string[];
  images: string[];
}

interface IntroPage {
  type: 'intro';
  content: string;
}

type Page = IntroPage | ProjectPage;

interface VillaBookProps {
  villa: VillaBookData;
  onClose: () => void;
}

const VillaBook = ({ villa, onClose }: VillaBookProps) => {
  const [pages, setPages] = useState<Page[]>([{ type: 'intro', content: villa.intro }]);
  const [currentPage, setCurrentPage] = useState(0);
  const [visible, setVisible] = useState(false);
  const [imageIdx, setImageIdx] = useState(0);

  // Animate in
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 20);
    return () => clearTimeout(t);
  }, []);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 350);
  }, [onClose]);

  // Keyboard nav
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') setCurrentPage(p => Math.min(p + 1, pages.length - 1));
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   setCurrentPage(p => Math.max(p - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleClose, pages.length]);

  // Reset image index when page changes
  useEffect(() => { setImageIdx(0); }, [currentPage]);

  // Fetch projects from Supabase for this villa
  useEffect(() => {
    if (!villa.clientMatch) return;

    supabase
      .from('projects')
      .select(`
        id, title, description, involvement, year,
        project_images (image_url, is_primary, display_order),
        project_tags (tags (name))
      `)
      .ilike('client', `%${villa.clientMatch}%`)
      .eq('visible', true)
      .order('year', { ascending: true })
      .then(({ data, error }) => {
        if (error || !data) return;
        const projectPages: ProjectPage[] = data.map((p: any) => ({
          type: 'project',
          id: p.id,
          title: p.title,
          description: p.description,
          involvement: p.involvement,
          year: p.year,
          tags: p.project_tags?.map((pt: any) => pt.tags?.name).filter(Boolean) ?? [],
          images: (p.project_images ?? [])
            .sort((a: any, b: any) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0) || (a.display_order ?? 99) - (b.display_order ?? 99))
            .map((img: any) => img.image_url)
            .filter(Boolean),
        }));
        setPages([{ type: 'intro', content: villa.intro }, ...projectPages]);
      });
  }, [villa]);

  const page = pages[currentPage];
  const accentColor = villa.color;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center transition-all duration-350 ${visible ? 'opacity-100' : 'opacity-0'}`}
      style={{ background: 'rgba(10,8,20,0.88)', backdropFilter: 'blur(12px)' }}
    >
      {/* Book container */}
      <div
        className={`relative w-full max-w-3xl mx-4 transition-transform duration-350 ${visible ? 'translate-y-0' : 'translate-y-8'}`}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute -top-10 right-0 text-white/40 hover:text-white/80 transition-colors"
          aria-label="Close"
        >
          <X size={22} />
        </button>

        {/* Book */}
        <div className="bg-[#faf6ee] rounded-2xl shadow-2xl overflow-hidden">
          {/* Book spine accent */}
          <div className="h-1.5 w-full" style={{ background: accentColor }} />

          <div className="p-8 md:p-12 min-h-[520px] flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between mb-8">
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] font-sans text-black/30 mb-1">
                  {currentPage === 0 ? 'Introduction' : `Project ${currentPage} of ${pages.length - 1}`}
                </p>
                <h2 className="font-serif text-3xl font-light tracking-tight text-black/85">
                  {currentPage === 0 ? villa.company : (page as ProjectPage).title}
                </h2>
                <p className="mt-1 text-sm font-sans text-black/40">
                  {villa.role} · {villa.years}
                </p>
              </div>
              {/* Page indicator dots */}
              <div className="flex gap-1.5 mt-1">
                {pages.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i)}
                    className="w-1.5 h-1.5 rounded-full transition-all duration-200"
                    style={{ background: i === currentPage ? accentColor : 'rgba(0,0,0,0.15)' }}
                  />
                ))}
              </div>
            </div>

            {/* Page content */}
            <div className="flex-1 overflow-y-auto">
              {page.type === 'intro' ? (
                <div className="prose prose-sm max-w-none text-black/70 font-sans leading-relaxed">
                  <ReactMarkdown>{page.content}</ReactMarkdown>
                </div>
              ) : (
                <ProjectPageContent
                  page={page}
                  imageIdx={imageIdx}
                  setImageIdx={setImageIdx}
                  accentColor={accentColor}
                />
              )}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8 pt-4 border-t border-black/8">
              <button
                onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                disabled={currentPage === 0}
                className="flex items-center gap-1.5 text-xs font-sans uppercase tracking-widest text-black/35 hover:text-black/70 disabled:opacity-20 transition-colors"
              >
                <ChevronLeft size={14} /> Previous
              </button>
              <span className="text-[10px] font-mono text-black/25">
                {currentPage + 1} / {pages.length}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(pages.length - 1, p + 1))}
                disabled={currentPage === pages.length - 1}
                className="flex items-center gap-1.5 text-xs font-sans uppercase tracking-widest text-black/35 hover:text-black/70 disabled:opacity-20 transition-colors"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Project page sub-component ───────────────────────────────────────────────
const ProjectPageContent = ({
  page,
  imageIdx,
  setImageIdx,
  accentColor,
}: {
  page: ProjectPage;
  imageIdx: number;
  setImageIdx: (n: number) => void;
  accentColor: string;
}) => (
  <div className="space-y-5">
    {/* Images */}
    {page.images.length > 0 && (
      <div className="relative rounded-lg overflow-hidden bg-black/5" style={{ aspectRatio: '16/9' }}>
        <img
          src={page.images[imageIdx]}
          alt={page.title}
          className="w-full h-full object-cover"
        />
        {page.images.length > 1 && (
          <>
            <button
              onClick={() => setImageIdx(Math.max(0, imageIdx - 1))}
              disabled={imageIdx === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-1 disabled:opacity-20"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setImageIdx(Math.min(page.images.length - 1, imageIdx + 1))}
              disabled={imageIdx === page.images.length - 1}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-1 disabled:opacity-20"
            >
              <ChevronRight size={16} />
            </button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {page.images.map((_, i) => (
                <div
                  key={i}
                  className="w-1 h-1 rounded-full"
                  style={{ background: i === imageIdx ? accentColor : 'rgba(255,255,255,0.5)' }}
                />
              ))}
            </div>
          </>
        )}
      </div>
    )}

    {/* Meta */}
    <div className="flex items-center gap-3 flex-wrap">
      {page.year && (
        <span className="text-[10px] font-mono text-black/30">{page.year}</span>
      )}
      {page.tags.map(tag => (
        <span
          key={tag}
          className="text-[10px] font-sans uppercase tracking-wide px-2 py-0.5 rounded-full border"
          style={{ borderColor: `${accentColor}60`, color: accentColor }}
        >
          {tag}
        </span>
      ))}
    </div>

    {/* Description */}
    <div className="prose prose-sm max-w-none text-black/65 font-sans leading-relaxed">
      <ReactMarkdown>{page.description}</ReactMarkdown>
    </div>

    {/* Involvement */}
    {page.involvement && (
      <div className="pt-2 border-t border-black/8">
        <p className="text-[10px] uppercase tracking-widest text-black/30 mb-1 font-sans">My role</p>
        <p className="text-sm text-black/55 font-sans leading-relaxed">{page.involvement}</p>
      </div>
    )}
  </div>
);

export default VillaBook;
