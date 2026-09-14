import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const CRT_FG = '#88c0d0';
const CRT_FG_DIM = 'rgba(136,192,208,0.45)';
const CRT_BG_HOVER = 'rgba(136,192,208,0.06)';
const CRT_BG_ACTIVE = 'rgba(136,192,208,0.12)';

interface Project {
  id: string;
  title: string;
  client: string;
  year: number | null;
  description: string;
}

interface ProjectBrowserWindowProps {
  onOpenProject: (project: Project) => void;
}

const FolderIcon = () => (
  <svg width="36" height="30" viewBox="0 0 36 30" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M1 6 L1 29 L35 29 L35 9 L17 9 L14 6 Z" stroke={CRT_FG} strokeWidth="1" fill="none" />
    <path d="M1 9 L35 9" stroke={CRT_FG} strokeWidth="0.5" opacity="0.4" />
  </svg>
);

export function ProjectBrowserWindow({ onOpenProject }: ProjectBrowserWindowProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('id, title, client, year, description')
          .eq('visible', true)
          .eq('unlisted', false)
          .order('year', { ascending: false });
        if (error) throw error;
        setProjects(data ?? []);
      } catch (err) {
        console.error('ProjectBrowserWindow fetch error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 24, color: CRT_FG_DIM, fontSize: 11, letterSpacing: '0.1em' }}>
        LOADING PROJECT INDEX...
      </div>
    );
  }

  return (
    <div style={{ padding: '12px 8px', height: '100%', boxSizing: 'border-box' }}>
      {/* Header row */}
      <div style={{
        fontSize: 9,
        letterSpacing: '0.2em',
        color: CRT_FG_DIM,
        borderBottom: `1px solid rgba(136,192,208,0.15)`,
        paddingBottom: 6,
        marginBottom: 12,
        textTransform: 'uppercase',
      }}>
        {projects.length} RECORDS — CLICK TO OPEN
      </div>

      {/* Project folder grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
        gap: '16px 8px',
        paddingBottom: 16,
      }}>
        {projects.map((project) => (
          <button
            key={project.id}
            onClick={() => {
              setActiveId(project.id);
              onOpenProject(project);
            }}
            onDoubleClick={() => onOpenProject(project)}
            style={{
              background: activeId === project.id ? CRT_BG_ACTIVE : 'none',
              border: activeId === project.id ? `1px solid rgba(136,192,208,0.3)` : '1px solid transparent',
              padding: '8px 4px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              fontFamily: 'IBM Plex Mono, monospace',
              transition: 'background 0.1s',
            }}
            onMouseEnter={(e) => {
              if (activeId !== project.id)
                (e.currentTarget as HTMLButtonElement).style.background = CRT_BG_HOVER;
            }}
            onMouseLeave={(e) => {
              if (activeId !== project.id)
                (e.currentTarget as HTMLButtonElement).style.background = 'none';
            }}
          >
            <FolderIcon />
            <span style={{
              fontSize: 9,
              color: CRT_FG,
              textAlign: 'center',
              lineHeight: '1.3',
              letterSpacing: '0.04em',
              maxWidth: 80,
              wordBreak: 'break-word',
              textTransform: 'uppercase',
            }}>
              {project.title}
            </span>
            {project.year && (
              <span style={{ fontSize: 8, color: CRT_FG_DIM, letterSpacing: '0.05em' }}>
                {project.year}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
