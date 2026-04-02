import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const CRT_FG = '#88c0d0';
const CRT_FG_DIM = 'rgba(136,192,208,0.5)';
const CRT_FG_GHOST = 'rgba(136,192,208,0.3)';
const DIVIDER = '─'.repeat(40);

interface ProjectDetail {
  id: string;
  title: string;
  client: string;
  year: number | null;
  description: string;
  involvement: string | null;
  liveurl: string | null;
  tags: string[];
}

interface ProjectDetailWindowProps {
  projectId: string;
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
            project_tags (tags (name))
          `)
          .eq('id', projectId)
          .single();
        if (error) throw error;
        if (data) {
          setProject({
            id: data.id,
            title: data.title,
            client: data.client,
            year: data.year,
            description: data.description,
            involvement: data.involvement,
            liveurl: data.liveurl,
            tags: (data as any).project_tags?.map((pt: any) => pt.tags?.name).filter(Boolean) ?? [],
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

      {/* Description */}
      <div style={{ fontSize: 11, lineHeight: 1.7, color: CRT_FG, marginBottom: 14, letterSpacing: '0.02em' }}>
        {project.description}
      </div>

      {/* Involvement */}
      {project.involvement && (
        <div style={{ fontSize: 10, color: CRT_FG_DIM, marginBottom: 12, letterSpacing: '0.08em' }}>
          ROLE: {project.involvement}
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
