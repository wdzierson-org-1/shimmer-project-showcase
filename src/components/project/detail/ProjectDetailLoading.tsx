
import React from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

const ProjectDetailLoading: React.FC = () => {
  return (
    <div>
      <Header />
      <div className="container mx-auto pt-24 px-4 md:px-6 flex justify-center">
        <div className="text-lg">Loading project details...</div>
      </div>
      <Footer />
    </div>
  );
};

export default ProjectDetailLoading;
