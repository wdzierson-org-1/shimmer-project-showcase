
import React from 'react';
import { Project } from '@/components/project/ProjectCard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  const detailsContent = (
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
  );

  const imagesContent = (
    <ProjectImageCarousel 
      mainImageUrl={project.imageUrl} 
      additionalImages={project.additionalImages}
      title={project.title}
    />
  );

  return (
    <div className="h-full flex flex-col overflow-y-auto bg-[#f9f9f7]">
      {/* Header with just the X to close - 40% transparent */}
      <div className="sticky top-0 z-10 py-4 px-6 flex justify-end bg-[#f9f9f7]/40 backdrop-blur-sm">
        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-gray-200/60">
          <X size={20} />
        </Button>
      </div>
      
      <div className="flex-grow px-6 pb-12 max-w-7xl mx-auto w-full">
        {/* Mobile: tabbed layout */}
        <div className="lg:hidden">
          <Tabs defaultValue="about">
            <TabsList className="w-full mb-6 bg-transparent border-b border-border/40 rounded-none h-auto p-0 gap-0 justify-start">
              <TabsTrigger
                value="about"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-3 pt-0 text-sm font-normal text-muted-foreground data-[state=active]:text-foreground"
              >
                About
              </TabsTrigger>
              <TabsTrigger
                value="media"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-3 pt-0 text-sm font-normal text-muted-foreground data-[state=active]:text-foreground"
              >
                Media
              </TabsTrigger>
            </TabsList>
            <TabsContent value="about" className="mt-0">
              {detailsContent}
            </TabsContent>
            <TabsContent value="media" className="mt-0">
              {imagesContent}
            </TabsContent>
          </Tabs>
        </div>

        {/* Desktop: two-column layout */}
        <div className="hidden lg:grid grid-cols-2 gap-12">
          <div className="space-y-6">
            {imagesContent}
          </div>
          <div className="space-y-8">
            {detailsContent}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetail;
