import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';

const CRT_FG = '#88c0d0';
const CRT_FG_DIM = 'rgba(136,192,208,0.5)';
const CRT_FG_GHOST = 'rgba(136,192,208,0.3)';
const CRT_FG_BRIGHT = '#a8d8e8';
const DIVIDER = '─'.repeat(40);

interface ProjectImage {
  image_url: string;
  is_primary: boolean | null;
  display_order: number | null;
  media_type: string | null;
}

interface ProjectDetail {
  id: string;
  title: string;
  client: string;
  year: number | null;
  description: string;
  involvement: string | null;
  liveurl: string | null;
  tags: string[];
  images: ProjectImage[];
}

interface ProjectDetailWindowProps {
  projectId: string;
}

/** Markdown rendered in CRT palette — plain text only, no HTML passthrough */
function CRTMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => (
          <p style={{ color: CRT_FG, margin: '0 0 8px', lineHeight: 1.7 }}>{children}</p>
        ),
        strong: ({ children }) => (
          <strong style={{ color: CRT_FG_BRIGHT, fontWeight: 700 }}>{children}</strong>
        ),
        em: ({ children }) => (
          <em style={{ color: CRT_FG_DIM }}>{children}</em>
        ),
        ul: ({ children }) => (
          <ul style={{ paddingLeft: 16, margin: '4px 0 8px', color: CRT_FG }}>{children}</ul>
        ),
        ol: ({ children }) => (
          <ol style={{ paddingLeft: 16, margin: '4px 0 8px', color: CRT_FG }}>{children}</ol>
        ),
        li: ({ children }) => (
          <li style={{ color: CRT_FG, marginBottom: 2 }}>{children}</li>
        ),
        a: ({ children, href }) => (
          <a href={href} target="_blank" rel="noopener noreferrer"
            style={{ color: CRT_FG_BRIGHT, textDecoration: 'underline' }}>
            {children}
          </a>
        ),
        h1: ({ children }) => (
          <div style={{ color: CRT_FG_BRIGHT, fontSize: 13, letterSpacing: '0.08em',
            textTransform: 'uppercase', margin: '8px 0 4px' }}>{children}</div>
        ),
        h2: ({ children }) => (
          <div style={{ color: CRT_FG_BRIGHT, fontSize: 11, letterSpacing: '0.08em',
            textTransform: 'uppercase', margin: '6px 0 4px' }}>{children}</div>
        ),
        code: ({ children }) => (
          <code style={{ color: CRT_FG_BRIGHT, background: 'rgba(136,192,208,0.08)',
            padding: '1px 4px', fontSize: 10 }}>{children}</code>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

/** Single monochrome thumbnail with scanlines and pixel-art dither feel */
function MonochromeThumbnail({ src }: { src: string }) {
  return (
    <div style={{ position: 'relative', overflow: 'hidden', marginBottom: 8 }}>
      <img
        src={src}
        alt=""
        loading="lazy"
        style={{
          display: 'block',
          width: '100%',
          aspectRatio: '16 / 9',
          objectFit: 'cover',
          filter: 'grayscale(1) contrast(1.45) brightness(0.78) sepia(0.15)',
          imageRendering: 'pixelated',
          opacity: 0.82,
        }}
      />
      {/* Horizontal scanlines */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'repeating-linear-gradient(0deg, rgba(0,0,0,0.22) 0px, rgba(0,0,0,0.22) 1px, transparent 1px, transparent 3px)',
          pointerEvents: 'none',
        }}
      />
      {/* Subtle phosphor tint */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(136,192,208,0.06)',
          mixBlendMode: 'screen',
          pointerEvents: 'none',
        }}
      />
      {/* Thin border in CRT palette */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          border: '1px solid rgba(136,192,208,0.2)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}

export function ProjectDetailWindow({ projectId }: ProjectDetailWindowProps) {
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('projects')
          .select(`
            id, title, client, year, description, involvement, liveurl,
            project_tags (tags (name)),
            project_images (image_url, is_primary, display_order, media_type)
          `)
          .eq('id', projectId)
          .single();
        if (error) throw error;
        if (data) {
          const allImages: ProjectImage[] = ((data as any).project_images ?? [])
            .filter((img: any) => img.media_type !== 'video')
            .sort((a: any, b: any) => (a.display_order ?? 99) - (b.display_order ?? 99));

          setProject({
            id: data.id,
            title: data.title,
            client: data.client,
            year: data.year,
            description: data.description,
            involvement: data.involvement,
            liveurl: data.liveurl,
            tags: (data as any).project_tags?.map((pt: any) => pt.tags?.name).filter(Boolean) ?? [],
            images: allImages,
          });
        }
      } catch (err) {
        console.error('ProjectDetailWindow fetch error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [projectId]);

  if (loading) {
    return (
      <div style={{ padding: 20, color: CRT_FG_DIM, fontSize: 11, letterSpacing: '0.1em' }}>
        RETRIEVING RECORD...
      </div>
    );
  }

  if (!project) {
    return (
      <div style={{ padding: 20, color: CRT_FG_DIM, fontSize: 11 }}>
        RECORD NOT FOUND
      </div>
    );
  }

  // Up to 3 thumbnails: prefer non-primary images, fall back to primary if few images
  const thumbnails = project.images.slice(0, 3);

  return (
    <div style={{
      padding: '16px 20px',
      fontFamily: 'IBM Plex Mono, monospace',
      color: CRT_FG,
      height: '100%',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      gap: 0,
      overflowY: 'auto',
    }}>
      {/* Record header */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 9, color: CRT_FG_DIM, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6 }}>
          WILLCO SYSTEMS — PROJECT RECORD
        </div>
        <div style={{ fontSize: 16, letterSpacing: '0.08em', textTransform: 'uppercase', color: CRT_FG, lineHeight: 1.2 }}>
          {project.title}
        </div>
        <div style={{ fontSize: 10, color: CRT_FG_DIM, marginTop: 4, letterSpacing: '0.1em' }}>
          {project.client}{project.year ? ` · ${project.year}` : ''}
        </div>
      </div>

      {/* Divider */}
      <div style={{ fontSize: 9, color: CRT_FG_GHOST, marginBottom: 12, letterSpacing: 0 }}>
        {DIVIDER}
      </div>

      {/* Monochrome thumbnails */}
      {thumbnails.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          {thumbnails.map((img, i) => (
            <MonochromeThumbnail key={i} src={img.image_url} />
          ))}
        </div>
      )}

      {/* Description — rendered as markdown */}
      <div style={{ fontSize: 11, letterSpacing: '0.02em', marginBottom: 14 }}>
        <CRTMarkdown content={project.description} />
      </div>

      {/* Involvement */}
      {project.involvement && (
        <div style={{ fontSize: 10, color: CRT_FG_DIM, marginBottom: 12, letterSpacing: '0.08em' }}>
          ROLE: <CRTMarkdown content={project.involvement} />
        </div>
      )}

      {/* Tags */}
      {project.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 6px', marginBottom: 16 }}>
          {project.tags.map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: 9,
                color: CRT_FG_DIM,
                border: '1px solid rgba(136,192,208,0.25)',
                padding: '2px 6px',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Divider */}
      <div style={{ fontSize: 9, color: CRT_FG_GHOST, marginBottom: 12, letterSpacing: 0 }}>
        {DIVIDER}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12, marginTop: 'auto' }}>
        <button
          onClick={() => navigate(`/project/${project.id}`)}
          style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 10,
            color: CRT_FG,
            background: 'none',
            border: `1px solid ${CRT_FG}`,
            padding: '5px 12px',
            cursor: 'pointer',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            transition: 'background 0.1s, color 0.1s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(136,192,208,0.12)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'none';
          }}
        >
          [ VIEW FULL PROJECT → ]
        </button>
        {project.liveurl && (
          <a
            href={project.liveurl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: 10,
              color: CRT_FG_DIM,
              border: `1px solid rgba(136,192,208,0.3)`,
              padding: '5px 12px',
              cursor: 'pointer',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            [ LIVE SITE ↗ ]
          </a>
        )}
      </div>
    </div>
  );
}
