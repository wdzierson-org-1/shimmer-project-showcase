
import { useState } from 'react';
import { Project } from '@/components/project/ProjectCard';
import { ContentEntry } from '@/services/content/contentService';

export const useDialogState = () => {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedContent, setSelectedContent] = useState<ContentEntry | null>(null);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [contentDialogOpen, setContentDialogOpen] = useState(false);

  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project);
    setProjectDialogOpen(true);
  };

  const handleContentSelect = (content: ContentEntry) => {
    setSelectedContent(content);
    setContentDialogOpen(true);
  };

  const handleCloseProjectDetail = () => {
    setSelectedProject(null);
    setProjectDialogOpen(false);
  };

  const handleCloseContentDetail = () => {
    setSelectedContent(null);
    setContentDialogOpen(false);
  };

  return {
    selectedProject,
    selectedContent,
    projectDialogOpen,
    contentDialogOpen,
    handleProjectSelect,
    handleContentSelect,
    handleCloseProjectDetail,
    handleCloseContentDetail,
  };
};
