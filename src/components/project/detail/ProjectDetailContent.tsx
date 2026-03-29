
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Project } from '@/components/project/ProjectCard';
import ProjectImageCarousel from '@/components/project/detail/ProjectImageCarousel';
import ProjectMeta from '@/components/project/detail/ProjectMeta';
import ProjectInfoSections from '@/components/project/detail/ProjectInfoSections';
import ProjectDescription from '@/components/project/detail/ProjectDescription';

interface ProjectWithImages extends Project {
  additionalImages?: string[];
  liveUrl?: string;
  involvement?: string;
}

interface ProjectDetailContentProps {
  project: ProjectWithImages;
}

const ProjectDetailContent: React.FC<ProjectDetailContentProps> = ({ project }) => {
  return (
    <main className="flex-grow pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-6 md:px-12">

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
              <ProjectMeta
                client={project.client}
                title={project.title}
                tags={project.tags}
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
            </TabsContent>
            <TabsContent value="media" className="mt-0">
              <ProjectImageCarousel
                mainImageUrl={project.imageUrl}
                additionalImages={project.additionalImages}
                title={project.title}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Desktop: two-column layout */}
        <div className="hidden lg:grid grid-cols-2 gap-12 items-start">
          <div>
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
