
import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

const HomeHeader = () => {
  return (
    <header className="absolute top-0 left-0 w-full px-4 md:px-8 lg:px-12 py-6">
      <div className="container mx-auto">
        <div className="flex justify-between items-center">
          <h1 className={cn(
            "font-serif text-lg tracking-wide text-foreground",
            "transition-all hover:opacity-70"
          )}>
            WILL DZIERSON / RECENT WORK
          </h1>
          
          <nav className="flex gap-6">
            <Link 
              to="/projects" 
              className={cn(
                "font-serif text-sm tracking-wide text-foreground",
                "transition-all hover:opacity-70 uppercase"
              )}
            >
              Projects
            </Link>
            <Link 
              to="/entries" 
              className={cn(
                "font-serif text-sm tracking-wide text-foreground",
                "transition-all hover:opacity-70 uppercase"
              )}
            >
              Writing
            </Link>
            <Link 
              to="/about" 
              className={cn(
                "font-serif text-sm tracking-wide text-foreground",
                "transition-all hover:opacity-70 uppercase"
              )}
            >
              About
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default HomeHeader;
