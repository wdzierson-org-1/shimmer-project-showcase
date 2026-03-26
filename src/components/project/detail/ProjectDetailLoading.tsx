
import React from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

const ProjectDetailLoading: React.FC = () => {
  return (
    <div>
      <Header />
      <div className="container mx-auto pt-24 px-4 md:px-6 flex justify-center items-center min-h-[50vh]">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="block w-2 h-2 rounded-full bg-foreground/30 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ProjectDetailLoading;
