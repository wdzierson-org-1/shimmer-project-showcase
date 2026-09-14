import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const CRT_FG = '#88c0d0';
const CRT_FG_DIM = 'rgba(136,192,208,0.45)';
const CRT_FG_GHOST = 'rgba(136,192,208,0.2)';
const CRT_BG_HOVER = 'rgba(136,192,208,0.08)';

interface Project {
  id: string;
  title: string;
  client: string;
  year: number;
  description: string;
}

interface PortfolioTimelineWindowProps {
  onOpenProject: (project: Project) => void;
}

const YEAR_W = 60;        // px per year column
const ROW_H = 36;         // px per project row
const BAR_H = 18;         // height of a project bar
const LABEL_PAD = 8;      // left padding for labels
const HEADER_H = 48;      // top axis area height
const LEFT_PAD = 0;       // no left padding — axis starts at 0
const MIN_BAR_W = 48;     // minimum bar width for single-year projects
const FOOTER_H = 28;

export function PortfolioTimelineWindow({ onOpenProject }: PortfolioTimelineWindowProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('id, title, client, year, description')
          .eq('visible', true)
          .eq('unlisted', false)
          .not('year', 'is', null)
          .order('year', { ascending: true });
        if (error) throw error;
        setProjects((data ?? []).filter((p) => p.year));
      } catch (err) {
        console.error('PortfolioTimeline fetch error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 24, color: CRT_FG_DIM, fontSize: 11, letterSpacing: '0.1em' }}>
        LOADING TIMELINE...
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div style={{ padding: 24, color: CRT_FG_DIM, fontSize: 11 }}>
        NO RECORDS FOUND
      </div>
    );
  }

  const minYear = Math.min(...projects.map((p) => p.year));
  const maxYear = Math.max(2026, Math.max(...projects.map((p) => p.year)));
  const years = Array.from({ length: maxYear - minYear + 2 }, (_, i) => minYear + i);
  const totalW = years.length * YEAR_W;
  const totalContentH = projects.length * ROW_H;

  const yearToX = (year: number) => (year - minYear) * YEAR_W;

  // Stagger rows to avoid label overlap — assign row index in order
  const hexAddr = `0x${(projects.length * 0x1a0b).toString(16).toUpperCase().padStart(4, '0')}`;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      fontFamily: 'IBM Plex Mono, monospace',
      background: '#0e0e14',
      color: CRT_FG,
      overflow: 'hidden',
    }}>
      {/* Scrollable canvas area */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowX: 'auto',
          overflowY: 'auto',
          position: 'relative',
        }}
      >
        <div style={{ width: totalW + 40, minHeight: HEADER_H + totalContentH + 20, position: 'relative' }}>

          {/* Year axis — top row */}
          <div style={{
            position: 'sticky',
            top: 0,
            left: 0,
            height: HEADER_H,
            width: totalW + 40,
            background: '#0e0e14',
            zIndex: 10,
            borderBottom: `1px solid rgba(136,192,208,0.2)`,
          }}>
            {/* "YEARS" label */}
            <div style={{
              position: 'absolute',
              left: LABEL_PAD,
              top: 8,
              fontSize: 8,
              letterSpacing: '0.2em',
              color: CRT_FG_GHOST,
              textTransform: 'uppercase',
            }}>
              YEARS
            </div>
            {/* Year tick marks */}
            {years.map((yr) => (
              <div
                key={yr}
                style={{
                  position: 'absolute',
                  left: LEFT_PAD + yearToX(yr),
                  top: 0,
                  width: YEAR_W,
                  height: HEADER_H,
                  borderLeft: `1px solid rgba(136,192,208,0.12)`,
                }}
              >
                <span style={{
                  position: 'absolute',
                  bottom: 8,
                  left: 4,
                  fontSize: 9,
                  color: yr % 5 === 0 ? CRT_FG_DIM : CRT_FG_GHOST,
                  letterSpacing: '0.05em',
                  fontWeight: yr % 5 === 0 ? 'normal' : 'normal',
                }}>
                  {yr}
                </span>
                {yr % 5 === 0 && (
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    width: 1,
                    height: 6,
                    background: CRT_FG_DIM,
                  }} />
                )}
              </div>
            ))}
          </div>

          {/* Project bars */}
          {projects.map((project, idx) => {
            const x = LEFT_PAD + yearToX(project.year);
            const y = HEADER_H + idx * ROW_H + (ROW_H - BAR_H) / 2;
            const barW = Math.max(MIN_BAR_W, YEAR_W - 4);
            const isHovered = hoveredId === project.id;

            return (
              <div key={project.id}>
                {/* Subtle row stripe */}
                <div style={{
                  position: 'absolute',
                  left: 0,
                  top: HEADER_H + idx * ROW_H,
                  width: totalW + 40,
                  height: ROW_H,
                  background: idx % 2 === 0 ? 'rgba(136,192,208,0.015)' : 'transparent',
                  pointerEvents: 'none',
                }} />

                {/* Clickable project bar */}
                <button
                  onClick={() => onOpenProject(project)}
                  onMouseEnter={() => setHoveredId(project.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{
                    position: 'absolute',
                    left: x,
                    top: y,
                    width: barW,
                    height: BAR_H,
                    background: isHovered ? 'rgba(136,192,208,0.18)' : 'rgba(136,192,208,0.07)',
                    border: `1px solid ${isHovered ? CRT_FG : 'rgba(136,192,208,0.35)'}`,
                    cursor: 'pointer',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    overflow: 'hidden',
                    transition: 'background 0.1s, border-color 0.1s',
                  }}
                >
                  {/* Inner fill bar — visual completion indicator */}
                  <div style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: `${60 + (idx % 4) * 10}%`,
                    background: 'rgba(136,192,208,0.06)',
                    borderRight: `1px solid rgba(136,192,208,0.15)`,
                  }} />

                  {/* Project title inside bar */}
                  <span style={{
                    position: 'relative',
                    zIndex: 1,
                    fontSize: 8,
                    color: isHovered ? CRT_FG : CRT_FG_DIM,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    padding: '0 6px',
                    maxWidth: barW - 12,
                    display: 'block',
                  }}>
                    {project.title}
                  </span>
                </button>

                {/* Floating label above bar */}
                {isHovered && (
                  <div style={{
                    position: 'absolute',
                    left: x,
                    top: y - 18,
                    fontSize: 8,
                    color: CRT_FG,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                    background: '#0e0e14',
                    padding: '1px 4px',
                    border: '1px solid rgba(136,192,208,0.2)',
                    zIndex: 20,
                  }}>
                    {project.client} · {project.year}
                  </div>
                )}
              </div>
            );
          })}

          {/* Vertical "now" line at 2026 */}
          <div style={{
            position: 'absolute',
            left: LEFT_PAD + yearToX(2026),
            top: HEADER_H,
            width: 1,
            height: totalContentH,
            background: 'rgba(136,192,208,0.25)',
            borderLeft: '1px dashed rgba(136,192,208,0.3)',
            pointerEvents: 'none',
          }}>
            <span style={{
              position: 'absolute',
              top: 4,
              left: 4,
              fontSize: 8,
              color: CRT_FG_DIM,
              letterSpacing: '0.1em',
              whiteSpace: 'nowrap',
            }}>
              NOW
            </span>
          </div>
        </div>
      </div>

      {/* Footer status line */}
      <div style={{
        height: FOOTER_H,
        borderTop: `1px solid rgba(136,192,208,0.15)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 12px',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 8, color: CRT_FG_GHOST, letterSpacing: '0.15em' }}>
          {hexAddr} : PORTFOLIO TIMELINE
        </span>
        <span style={{ fontSize: 8, color: CRT_FG_GHOST, letterSpacing: '0.1em' }}>
          {projects.length} RECORDS · {minYear}–{maxYear}
        </span>
      </div>
    </div>
  );
}
