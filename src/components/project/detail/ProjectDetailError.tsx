
import React from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

interface ProjectDetailErrorProps {
  error: string;
}

const ProjectDetailError: React.FC<ProjectDetailErrorProps> = ({ error }) => {
  return (
    <div>
      <Header />
      <div className="max-w-7xl mx-auto pt-24 px-6 md:px-12">

        <h1 className="text-2xl font-bold mt-8">{error}</h1>
      </div>
      <Footer />
    </div>
  );
};

export default ProjectDetailError;
