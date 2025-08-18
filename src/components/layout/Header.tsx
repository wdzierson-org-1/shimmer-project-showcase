
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b">
      <div className="container mx-auto px-4 md:px-6 py-4 flex justify-between items-center">
        <Link to="/" className="text-2xl tracking-tight font-serif" style={{ fontWeight: 200 }}>
          Will Dzierson / Portfolio
        </Link>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/projects">All Projects</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/entries">All Entries</Link>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
