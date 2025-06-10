
import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Github } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Link } from 'react-router-dom';

const HomeIntro = () => {
  const [greeting, setGreeting] = useState('Hello');
  const { user } = useAuth();

  useEffect(() => {
    const getTimeBasedGreeting = () => {
      const hour = new Date().getHours();
      if (hour < 12) return 'Good morning';
      if (hour < 18) return 'Good afternoon';
      return 'Good evening';
    };
    
    setGreeting(getTimeBasedGreeting());
    
    // Update greeting if the user keeps the app open across different time periods
    const intervalId = setInterval(() => {
      setGreeting(getTimeBasedGreeting());
    }, 60000); // check every minute
    
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="lg:sticky lg:top-24 flex flex-col justify-between h-full">
      <div className="space-y-6">
        <h2 className={cn(
          "font-serif text-4xl md:text-5xl font-medium text-foreground",
          "tracking-tight leading-[1.15]"
        )}>
          {greeting} {user ? user.email?.split('@')[0] : ''}
        </h2>
        
        <div className={cn(
          "text-lg text-foreground/80 leading-relaxed",
          "font-light max-w-prose space-y-4"
        )}>
          <p>
            Let's chat. I built this AI version of my portfolio for fun. Ask it about my work or what I like to do, etc. With that in mind, it's an assistant. It’s not meant to be a “copy” of me. It knows stuff about stuff, but its main purpose is to help you explore.
          </p>
          
          <p>
            I am a designer and technologist, having always sat at the intersection of both. I love to design, and I also love to build.
          </p>
        </div>
      </div>
      
      <div className="space-y-4 mt-auto pt-12">
        <div>
          <a href="https://github.com/wdzierson/shimmer-project-showcase-pub" 
             className="flex items-center gap-2 text-foreground/80 hover:text-foreground">
            <Github size={18} />
            <span className="hover:underline">I'm open source: GitHub</span>
          </a>
        </div>
        
        <p className="text-foreground/80">
          Looking for <a 
            href="https://projectariadne.info" 
            className="text-foreground hover:underline"
            target="_blank" 
            rel="noopener noreferrer"
          >Project Ariadne</a>?
        </p>
        
        {user && (
          <p className="text-foreground/80">
            <Link to="/admin" className="text-foreground hover:underline">
              Admin Dashboard
            </Link>
          </p>
        )}
      </div>
    </div>
  );
};

export default HomeIntro;
