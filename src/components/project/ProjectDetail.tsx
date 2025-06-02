
import React from 'react';
import { Project } from '@/components/project/ProjectCard';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

// Import our new components
import ProjectHeader from '@/components/project/detail/ProjectHeader';
import ProjectImageCarousel from '@/components/project/detail/ProjectImageCarousel';
import ProjectMeta from '@/components/project/detail/ProjectMeta';
import ProjectInfoSections from '@/components/project/detail/ProjectInfoSections';
import ProjectDescription from '@/components/project/detail/ProjectDescription';

interface ProjectDetailProps {
  project: Project;
  onClose: () => void;
}

const ProjectDetail: React.FC<ProjectDetailProps> = ({ project, onClose }) => {
  // Check if project has multiple images
  const hasMultipleImages = Array.isArray(project.additionalImages) && project.additionalImages.length > 0;
  
  return (
    <div className="h-full flex flex-col overflow-y-auto bg-[#f9f9f7]">
      {/* Header with just the X to close - 40% transparent */}
      <div className="sticky top-0 z-10 py-4 px-6 flex justify-end bg-[#f9f9f7]/40 backdrop-blur-sm">
        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-gray-200/60">
          <X size={20} />
        </Button>
      </div>
      
      <div className="flex-grow px-6 pb-12 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left column - Images */}
          <div className="space-y-6">
            <ProjectImageCarousel 
              mainImageUrl={project.imageUrl} 
              additionalImages={project.additionalImages}
              title={project.title}
            />
          </div>
          
          {/* Right column - Details */}
          <div className="space-y-8">
            <ProjectMeta 
              client={project.client}
              title={project.title}
              tags={project.tags}
            />
            
            <div className="mt-8">
              <ProjectInfoSections 
                year={project.year || new Date(project.createdAt).getFullYear()}
                createdAt={project.createdAt}
              />
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
    </div>
  );
};

export default ProjectDetail;
