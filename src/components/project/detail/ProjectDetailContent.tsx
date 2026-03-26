
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
}

interface ProjectDetailContentProps {
  project: ProjectWithImages;
}

const ProjectDetailContent: React.FC<ProjectDetailContentProps> = ({ project }) => {
  return (
    <main className="flex-grow pt-24 px-6 md:px-12">
      <div className="max-w-7xl mx-auto">
        <Button asChild variant="ghost" className="mb-6 hidden lg:inline-flex -ml-3">
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Link>
        </Button>
        
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
        <div className="hidden lg:grid grid-cols-2 gap-12 min-h-[calc(100vh-12rem)]">
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
