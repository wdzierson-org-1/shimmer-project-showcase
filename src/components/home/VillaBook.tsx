import { useEffect, useState, useCallback, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';
import type { VillaBook as VillaBookData, CaveBook } from '@/lib/villaBooks';
import { X, ChevronLeft, ChevronRight, ExternalLink, Loader2 } from 'lucide-react';

interface ProjectPage {
  type: 'project';
  id: string;
  title: string;
  description: string;
  involvement: string | null;
  year: number;
  tags: string[];
  images: string[];
  liveurl: string | null;
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
  const [mediaIdx, setMediaIdx] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 20);
    return () => clearTimeout(t);
  }, []);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 300);
  }, [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
      if (e.key === 'ArrowRight') setCurrentPage(p => Math.min(p + 1, pages.length - 1));
      if (e.key === 'ArrowLeft')  setCurrentPage(p => Math.max(p - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleClose, pages.length]);

  useEffect(() => { setMediaIdx(0); }, [currentPage]);

  useEffect(() => {
    if (!villa.clientMatch || villa.clientMatch.length === 0) return;

    const matchPatterns = Array.isArray(villa.clientMatch) ? villa.clientMatch : [villa.clientMatch];

    Promise.all(
      matchPatterns.map(pattern =>
        supabase
          .from('projects')
          .select(`id, title, description, involvement, year, liveurl,
            project_images (image_url, is_primary, display_order),
            project_tags (tags (name))`)
          .ilike('client', `%${pattern}%`)
          .eq('visible', true)
          .order('year', { ascending: true })
      )
    ).then(results => {
      const seen = new Set<string>();
      const projectPages: ProjectPage[] = [];
      for (const { data, error } of results) {
        if (error || !data) continue;
        for (const p of data as any[]) {
          if (seen.has(p.id)) continue;
          seen.add(p.id);
          projectPages.push({
            type: 'project',
            id: p.id,
            title: p.title,
            description: p.description,
            involvement: p.involvement,
            year: p.year,
            liveurl: p.liveurl ?? null,
            tags: p.project_tags?.map((pt: any) => pt.tags?.name).filter(Boolean) ?? [],
            images: (p.project_images ?? [])
              .sort((a: any, b: any) =>
                (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0) ||
                (a.display_order ?? 99) - (b.display_order ?? 99))
              .map((img: any) => img.image_url)
              .filter(Boolean),
          });
        }
      }
      projectPages.sort((a, b) => a.year - b.year);
      setPages([{ type: 'intro', content: villa.intro }, ...projectPages]);
    });
  }, [villa]);

  // Prefetch adjacent page images
  useEffect(() => {
    for (const idx of [currentPage - 1, currentPage + 1]) {
      const p = pages[idx];
      if (!p || p.type !== 'project') continue;
      for (const url of (p as ProjectPage).images) {
        if (!isVideo(url)) {
          const img = new Image();
          img.src = url;
        }
      }
    }
  }, [currentPage, pages]);

  const page = pages[currentPage];
  const accent = villa.color;
  const isIntro = page.type === 'intro';
  const projectPage = isIntro ? null : (page as ProjectPage);

  return (
    <div
      className={`fixed inset-0 z-[100] overflow-y-auto transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
      style={{ background: 'rgba(8,6,18,0.92)', backdropFilter: 'blur(16px)' }}
      onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="min-h-full flex items-center justify-center py-8 px-4 sm:py-12">
        <div
          className={`relative w-full max-w-4xl transition-transform duration-300 ${visible ? 'translate-y-0' : 'translate-y-6'}`}
        >
          {/* Close */}
          <button
            onClick={handleClose}
            className="absolute top-20 right-3 sm:-top-10 sm:right-0 z-10 flex items-center gap-1.5 text-white/50 sm:text-white/30 hover:text-white/80 transition-colors text-xs font-sans tracking-widest uppercase bg-black/30 sm:bg-transparent rounded-full sm:rounded-none px-3 py-1.5 sm:px-0 sm:py-0"
          >
            <X size={13} /> Close
          </button>

          {/* Book */}
          <div className="bg-[#faf6ee] rounded-2xl shadow-2xl overflow-hidden">
            {/* Spine */}
            <div className="h-1 w-full" style={{ background: accent }} />

            {/* Header */}
            <div className="px-6 sm:px-8 pt-6 pb-4 border-b border-black/6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[9px] uppercase tracking-[0.25em] font-sans mb-1.5"
                     style={{ color: accent }}>
                    {isIntro
                      ? `${villa.role}  ·  ${villa.years}`
                      : `Project ${currentPage} of ${pages.length - 1}`}
                  </p>
                  <h2 className="font-serif text-[1.6rem] sm:text-[1.8rem] leading-tight font-light tracking-tight text-black/85 truncate">
                    {isIntro ? villa.company : projectPage!.title}
                  </h2>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  {!isIntro && projectPage?.liveurl && (
                    <a
                      href={projectPage.liveurl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[10px] font-sans tracking-wide hover:underline transition-colors"
                      style={{ color: accent }}
                    >
                      View full project <ExternalLink size={10} />
                    </a>
                  )}
                  <div className="flex gap-1.5">
                    {pages.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentPage(i)}
                        className="rounded-full transition-all duration-200 focus:outline-none"
                        style={{
                          width: i === currentPage ? '20px' : '6px',
                          height: '6px',
                          background: i === currentPage ? accent : 'rgba(0,0,0,0.15)',
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 sm:px-8 py-6 overflow-y-auto overflow-x-hidden" style={{ maxHeight: '65vh' }}>
              {isIntro ? (
                <div className="prose prose-sm max-w-none prose-headings:font-serif prose-headings:font-light prose-headings:tracking-tight prose-p:text-black/65 prose-p:leading-relaxed prose-h1:text-2xl prose-h2:text-lg prose-h2:mt-6 prose-h2:mb-2">
                  <ReactMarkdown>{page.content}</ReactMarkdown>
                </div>
              ) : (
                <ProjectPageContent
                  page={projectPage!}
                  mediaIdx={mediaIdx}
                  setMediaIdx={setMediaIdx}
                  accent={accent}
                />
              )}
            </div>

            {/* Footer nav */}
            <div className="px-6 sm:px-8 py-4 border-t border-black/6 bg-[#faf6ee]">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                  className="flex items-center gap-1.5 text-[11px] font-sans uppercase tracking-widest text-black/35 hover:text-black/70 disabled:opacity-20 transition-colors"
                >
                  <ChevronLeft size={13} /> Prev
                </button>
                <span className="text-[10px] font-mono text-black/20">
                  {currentPage + 1} / {pages.length}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(pages.length - 1, p + 1))}
                  disabled={currentPage === pages.length - 1}
                  className="flex items-center gap-1.5 text-[11px] font-sans uppercase tracking-widest text-black/35 hover:text-black/70 disabled:opacity-20 transition-colors"
                >
                  Next <ChevronRight size={13} />
                </button>
              </div>
              <div className="mt-3 pt-3 border-t border-black/5 text-center">
                <a
                  href="/projects"
                  className="text-[10px] font-sans uppercase tracking-widest text-black/35 hover:text-black/60 transition-colors"
                >
                  View all projects <ExternalLink size={9} className="inline mb-0.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Video/image detector ───────────────────────────────────────────────────────
function isVideo(url: string) {
  return /\.(mp4|webm|mov|ogg)(\?|$)/i.test(url);
}

// ── Loading media components ────────────────────────────────────────────────────
const MediaImage = ({ src, alt }: { src: string; alt: string }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div className="relative w-full h-full">
      {!loaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/4">
          <Loader2 size={24} className="animate-spin text-black/15" />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/4">
          <span className="text-[11px] text-black/25 font-sans">Failed to load</span>
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-contain object-center transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
    </div>
  );
};

const MediaVideo = ({ src }: { src: string }) => {
  const [loaded, setLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  return (
    <div className="relative w-full h-full">
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/4">
          <Loader2 size={24} className="animate-spin text-black/15" />
        </div>
      )}
      <video
        ref={videoRef}
        key={src}
        src={src}
        autoPlay muted loop playsInline
        className={`w-full h-full object-contain transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        onLoadedData={() => setLoaded(true)}
      />
    </div>
  );
};

// ── Project page sub-component ─────────────────────────────────────────────────
const ProjectPageContent = ({
  page, mediaIdx, setMediaIdx, accent,
}: {
  page: ProjectPage; mediaIdx: number; setMediaIdx: (n: number) => void; accent: string;
}) => {
  const media = page.images;
  const currentSrc = media[mediaIdx];
  const isVid = currentSrc ? isVideo(currentSrc) : false;

  return (
    <div className="space-y-5">
      {/* Media carousel — large prominent display */}
      {media.length > 0 && (
        <div className="relative rounded-xl overflow-hidden bg-gradient-to-b from-black/[0.03] to-black/[0.06] border border-black/[0.04] mx-auto flex items-center justify-center"
             style={{ minHeight: '280px', maxHeight: '480px', aspectRatio: '16/10' }}>
          {isVid ? (
            <MediaVideo key={currentSrc} src={currentSrc} />
          ) : (
            <MediaImage key={currentSrc} src={currentSrc} alt={page.title} />
          )}

          {media.length > 1 && (
            <>
              <button onClick={() => setMediaIdx(Math.max(0, mediaIdx - 1))} disabled={mediaIdx === 0}
                className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 backdrop-blur-sm text-white rounded-full p-2 disabled:opacity-20 hover:bg-black/70 transition-colors shadow-lg">
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => setMediaIdx(Math.min(media.length - 1, mediaIdx + 1))} disabled={mediaIdx === media.length - 1}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 backdrop-blur-sm text-white rounded-full p-2 disabled:opacity-20 hover:bg-black/70 transition-colors shadow-lg">
                <ChevronRight size={16} />
              </button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 bg-black/30 backdrop-blur-sm rounded-full px-3 py-1.5">
                {media.map((src, i) => (
                  <button key={i} onClick={() => setMediaIdx(i)}
                    className="rounded-full transition-all duration-200 focus:outline-none"
                    style={{
                      background: i === mediaIdx ? '#fff' : 'rgba(255,255,255,0.4)',
                      width: i === mediaIdx ? '16px' : '6px',
                      height: '6px',
                    }} />
                ))}
              </div>
            </>
          )}

          {/* Video/image type badge */}
          {isVid && (
            <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white/80 text-[9px] font-mono uppercase tracking-widest px-2 py-1 rounded">
              Video
            </div>
          )}
        </div>
      )}

      {/* Meta row */}
      <div className="flex items-center gap-2 flex-wrap">
        {page.year > 0 && <span className="text-[10px] font-mono text-black/30">{page.year}</span>}
        {page.tags.map(tag => (
          <span key={tag}
            className="text-[10px] font-sans uppercase tracking-wide px-2 py-0.5 rounded-full border"
            style={{ borderColor: `${accent}55`, color: accent }}>
            {tag}
          </span>
        ))}
      </div>

      {/* Description */}
      <div className="prose prose-sm max-w-none prose-p:text-black/65 prose-p:leading-relaxed prose-p:text-sm">
        <ReactMarkdown>{page.description}</ReactMarkdown>
      </div>

      {/* Involvement */}
      {page.involvement && (
        <div className="pt-3 border-t border-black/6">
          <p className="text-[9px] uppercase tracking-[0.22em] mb-1.5 font-sans" style={{ color: accent }}>
            My role
          </p>
          <p className="text-sm text-black/55 font-sans leading-relaxed">{page.involvement}</p>
        </div>
      )}
    </div>
  );
};

export default VillaBook;

// ── Cave Book Overlay (easter egg) ────────────────────────────────────────────
export const CaveBookOverlay = ({ cave, onClose }: { cave: CaveBook; onClose: () => void }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 20);
    return () => clearTimeout(t);
  }, []);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 300);
  }, [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleClose]);

  return (
    <div
      className={`fixed inset-0 z-[100] overflow-y-auto transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
      style={{ background: 'rgba(4,10,22,0.95)', backdropFilter: 'blur(20px)' }}
      onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="min-h-full flex items-center justify-center py-16 px-4">
        <div className={`relative w-full max-w-xl transition-transform duration-300 ${visible ? 'translate-y-0' : 'translate-y-6'}`}>
          <button
            onClick={handleClose}
            className="absolute top-20 right-3 sm:-top-10 sm:right-0 z-10 flex items-center gap-1.5 text-white/50 sm:text-white/30 hover:text-white/80 transition-colors text-xs font-sans tracking-widest uppercase bg-black/30 sm:bg-transparent rounded-full sm:rounded-none px-3 py-1.5 sm:px-0 sm:py-0"
          >
            <X size={13} /> Close
          </button>
          <div className="rounded-2xl shadow-2xl overflow-hidden" style={{ background: '#0c1828', border: '1px solid rgba(56,189,248,0.15)' }}>
            <div className="h-1 w-full" style={{ background: cave.color }} />
            <div className="px-8 pt-7 pb-5 border-b" style={{ borderColor: 'rgba(56,189,248,0.1)' }}>
              <p className="text-[9px] uppercase tracking-[0.25em] font-sans mb-1.5" style={{ color: cave.color }}>
                Easter Egg · Hidden Project
              </p>
              <h2 className="font-serif text-[1.7rem] leading-tight font-light tracking-tight text-white/90">
                {cave.title}
              </h2>
            </div>
            <div className="px-8 py-7 overflow-y-auto" style={{ maxHeight: '52vh' }}>
              <div className="prose prose-sm prose-invert max-w-none prose-headings:font-serif prose-headings:font-light prose-headings:tracking-tight prose-p:text-white/65 prose-p:leading-relaxed prose-h1:text-2xl prose-h2:text-lg prose-h2:mt-6 prose-h2:mb-2">
                <ReactMarkdown>{cave.intro}</ReactMarkdown>
              </div>
            </div>
            <div className="px-8 py-4 border-t flex items-center justify-between" style={{ borderColor: 'rgba(56,189,248,0.1)' }}>
              <a
                href="/projects"
                className="text-[10px] font-sans uppercase tracking-widest text-white/35 hover:text-white/60 transition-colors"
              >
                View all projects <ExternalLink size={9} className="inline mb-0.5" />
              </a>
              <a
                href="https://projectariadne.info"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[11px] font-sans tracking-wide hover:underline"
                style={{ color: cave.color }}
              >
                Visit Project Ariadne <ExternalLink size={11} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
