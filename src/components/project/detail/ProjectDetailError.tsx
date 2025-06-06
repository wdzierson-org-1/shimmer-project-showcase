
import React from 'react';
import { Link } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface ProjectDetailErrorProps {
  error: string;
}

const ProjectDetailError: React.FC<ProjectDetailErrorProps> = ({ error }) => {
  return (
    <div>
      <Header />
      <div className="container mx-auto pt-24 px-4 md:px-6">
        <Button asChild variant="ghost" className="mb-4">
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Chat
          </Link>
        </Button>
        <h1 className="text-2xl font-bold mt-8">{error}</h1>
      </div>
      <Footer />
    </div>
  );
};

export default ProjectDetailError;
