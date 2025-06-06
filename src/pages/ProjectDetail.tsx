
import React from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ProjectChatBot from '@/components/chat/ProjectChatBot';
import { useProjectDetail } from '@/hooks/useProjectDetail';
import ProjectDetailLoading from '@/components/project/detail/ProjectDetailLoading';
import ProjectDetailError from '@/components/project/detail/ProjectDetailError';
import ProjectDetailContent from '@/components/project/detail/ProjectDetailContent';

const ProjectDetail = () => {
  const { project, loading, error } = useProjectDetail();

  if (loading) {
    return <ProjectDetailLoading />;
  }
  
  if (error || !project) {
    return <ProjectDetailError error={error || 'Project not found'} />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <ProjectDetailContent project={project} />
      <Footer />
      <ProjectChatBot 
        projectTitle={project.title}
        projectDescription={project.description}
      />
    </div>
  );
};

export default ProjectDetail;
