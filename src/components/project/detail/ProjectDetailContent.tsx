
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Project } from '@/components/project/ProjectCard';
import ProjectImageCarousel from '@/components/project/detail/ProjectImageCarousel';
import ProjectMeta from '@/components/project/detail/ProjectMeta';
import ProjectInfoSections from '@/components/project/detail/ProjectInfoSections';
import ProjectDescription from '@/components/project/detail/ProjectDescription';

interface ProjectWithImages extends Project {
  additionalImages?: string[];
  liveUrl?: string;
  involvement?: string;
  year?: number;
}

interface ProjectDetailContentProps {
  project: ProjectWithImages;
}

const ProjectDetailContent: React.FC<ProjectDetailContentProps> = ({ project }) => {
  return (
    <main className="flex-grow pt-24 px-4 md:px-6">
      <div className="container mx-auto">
        <Button asChild variant="ghost" className="mb-6">
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Chat
          </Link>
        </Button>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-7xl mx-auto min-h-[calc(100vh-12rem)]">
          <div className="min-h-full">
            <ProjectImageCarousel 
              mainImageUrl={project.imageUrl} 
              additionalImages={project.additionalImages}
              title={project.title}
            />
          </div>
          
          <div>
            <ProjectMeta 
              client={project.client}
              title={project.title}
              tags={project.tags}
              year={project.year}
            />
            
            <div className="mt-8">
              <ProjectInfoSections />
            </div>
            
            <div className="mt-8">
              <ProjectDescription 
                description={project.description} 
                involvement={project.involvement}
                liveUrl={project.liveUrl}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default ProjectDetailContent;
