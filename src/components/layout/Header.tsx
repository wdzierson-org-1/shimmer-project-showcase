import { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getTimeTheme } from '@/lib/timeTheme';

const Header = () => {
  const { pathname } = useLocation();
  const isHome = pathname === '/';

  const theme = useMemo(() => getTimeTheme(), []);

  // On the homepage the header floats over the hero, so it should adapt.
  // On other pages the background is always light.
  const dark = isHome && !theme.isLight;

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b"
      style={{
        backgroundColor: dark
          ? `rgba(${Math.round(theme.bgRgb[0] * 255)}, ${Math.round(theme.bgRgb[1] * 255)}, ${Math.round(theme.bgRgb[2] * 255)}, 0.55)`
          : 'rgba(246, 243, 238, 0.80)',
        borderColor: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
      }}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-4 flex justify-between items-center">
        <Link
          to="/"
          className="font-serif text-lg tracking-tight no-underline hover:opacity-70 transition-opacity"
          style={{ fontWeight: 200, color: dark ? 'rgba(255,255,255,0.90)' : undefined }}
        >
          William Dzierson
        </Link>
        <nav className="flex items-center gap-6">
          <Link
            to="/projects"
            className="text-xs uppercase tracking-[0.15em] hover:opacity-100 transition-opacity font-sans no-underline"
            style={{
              color: dark ? 'rgba(255,255,255,0.50)' : undefined,
            }}
          >
            Projects
          </Link>
          <Link
            to="/entries"
            className="text-xs uppercase tracking-[0.15em] hover:opacity-100 transition-opacity font-sans no-underline"
            style={{
              color: dark ? 'rgba(255,255,255,0.50)' : undefined,
            }}
          >
            Writing
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default Header;
