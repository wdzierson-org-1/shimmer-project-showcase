import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

const SCROLL_THRESHOLD = 100;

const ScrollNav: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > SCROLL_THRESHOLD);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        'bg-background/80 backdrop-blur-md border-b',
        visible
          ? 'translate-y-0 opacity-100'
          : '-translate-y-full opacity-0 pointer-events-none'
      )}
    >
      <div className="container mx-auto px-4 md:px-6 lg:px-12 py-3 flex justify-between items-center">
        <Link
          to="/"
          className="font-serif text-sm tracking-wide text-foreground hover:opacity-70 transition-opacity uppercase"
        >
          Will Dzierson
        </Link>
        <div className="flex gap-6">
          <Link
            to="/projects"
            className="font-serif text-sm tracking-wide text-foreground hover:opacity-70 transition-opacity uppercase"
          >
            Projects
          </Link>
          <Link
            to="/entries"
            className="font-serif text-sm tracking-wide text-foreground hover:opacity-70 transition-opacity uppercase"
          >
            Writing
          </Link>
          <Link
            to="/about"
            className="font-serif text-sm tracking-wide text-foreground hover:opacity-70 transition-opacity uppercase"
          >
            About
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default ScrollNav;
