import { Link, useLocation } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';

const Header = () => {
  const { pathname } = useLocation();
  const isHome = pathname === '/';

  const textPrimary = isHome ? 'text-white/90 hover:text-white' : 'text-foreground/80 hover:text-foreground';
  const textMuted = isHome ? 'text-white/30' : 'text-foreground/35';
  const textNav = isHome ? 'text-white/45 hover:text-white/80' : 'text-foreground/45 hover:text-foreground/80';

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        backgroundColor: isHome ? 'rgba(0,0,0,0.60)' : 'rgba(246,243,238,0.85)',
        backdropFilter: isHome ? 'blur(8px)' : 'blur(12px)',
        borderBottom: isHome ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
      }}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-3.5 flex justify-between items-center">
        <div className="flex items-baseline gap-3">
          <Link
            to="/"
            className={`font-serif text-[15px] tracking-tight no-underline transition-colors ${textPrimary}`}
            style={{ fontWeight: 200 }}
          >
            William Dzierson
          </Link>
          <span className={`text-[10px] uppercase tracking-[0.18em] font-sans hidden sm:inline ${textMuted}`}>
            Design &amp; Engineering
          </span>
        </div>
        <nav className="flex items-center gap-6">
          <Link
            to="/projects"
            className={`text-[11px] uppercase tracking-[0.15em] transition-colors font-sans no-underline ${textNav}`}
          >
            All Projects
          </Link>
          <a
            href="https://www.threads.com/@willd"
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.15em] transition-colors font-sans no-underline ${textNav}`}
          >
            Threads
            <ExternalLink size={10} className="opacity-60" />
          </a>
        </nav>
      </div>
    </header>
  );
};

export default Header;
