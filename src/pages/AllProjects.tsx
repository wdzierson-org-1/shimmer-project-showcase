import React from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ProjectGrid from '@/components/project/ProjectGrid';

const AllProjects = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 pt-24 pb-12">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mb-8">
            <h1 className="text-3xl font-serif tracking-tight mb-2">All Projects</h1>
            <p className="text-muted-foreground">A collection of recent design and development work</p>
          </div>
          
          <ProjectGrid />
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default AllProjects;