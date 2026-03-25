import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ExternalLink, Search } from 'lucide-react';

const Header = () => {
  const { pathname } = useLocation();
  const isHome = pathname === '/';

  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      if (currentY < 50) {
        setIsVisible(true);
      } else if (currentY > lastScrollY.current) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      lastScrollY.current = currentY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const textPrimary = isHome ? 'text-white/90 hover:text-white' : 'text-foreground/80 hover:text-foreground';
  const textNav = isHome ? 'text-white/45 hover:text-white/80' : 'text-foreground/45 hover:text-foreground/80';

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        backgroundColor: isHome ? 'rgba(0,0,0,0.60)' : 'rgba(246,243,238,0.85)',
        backdropFilter: isHome ? 'blur(8px)' : 'blur(12px)',
        borderBottom: isHome ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
        transform: isVisible ? 'translateY(0)' : 'translateY(-100%)',
        transition: 'transform 300ms ease',
      }}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 pt-3 pb-[10px] flex justify-between items-center">
        <Link
          to="/"
          className={`font-serif text-[17px] tracking-[-0.01em] no-underline transition-colors ${textPrimary}`}
          style={{ fontWeight: 200 }}
        >
          William Dzierson
        </Link>
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
          <button
            aria-label="Search"
            onClick={() => window.dispatchEvent(new Event('open-search'))}
            className={`sm:hidden transition-colors ${textNav}`}
          >
            <Search size={14} />
          </button>
        </nav>
      </div>
    </header>
  );
};

export default Header;
