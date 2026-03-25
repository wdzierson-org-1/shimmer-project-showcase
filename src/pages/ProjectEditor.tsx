
import React, { useState } from 'react';
import { toast } from 'sonner';
import ProjectEditorHeader from '@/components/project-editor/ProjectEditorHeader';
import ProjectEditorForm from '@/components/project-editor/ProjectEditorForm';
import { useProjectData } from '@/hooks/useProjectData';
import { saveProject } from '@/services/projectService';

const ProjectEditor = () => {
  const {
    isNew,
    id,
    loading,
    projectData,
    handleAddTag,
    handleRemoveTag,
    navigate
  } = useProjectData();
  
  const [isSaving, setIsSaving] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSaving) return; // Prevent multiple submissions
    
    try {
      setIsSaving(true);
      
      // Validate required fields
      if (!projectData.title.trim()) {
        toast.error("Project title is required");
        setIsSaving(false);
        return;
      }
      
      if (!projectData.client.trim()) {
        toast.error("Client name is required");
        setIsSaving(false);
        return;
      }
      
      if (!projectData.description.trim()) {
        toast.error("Project description is required");
        setIsSaving(false);
        return;
      }
      
      const success = await saveProject({
        id,
        title: projectData.title,
        client: projectData.client,
        description: projectData.description,
        imageUrl: projectData.imageUrl,
        additionalImages: projectData.additionalImages,
        liveUrl: projectData.liveUrl,
        involvement: projectData.involvement,
        year: projectData.year,
        featured: projectData.featured,
        tags: projectData.tags,
        isNew
      });
      
      if (success) {
        navigate('/admin/projects');
      }
    } catch (error) {
      console.error('Error saving project:', error);
      toast.error('An unexpected error occurred while saving the project');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    navigate('/admin/projects');
  };
  
  return (
    <div className="min-h-screen bg-muted/20">
      <div className="container mx-auto py-8 px-4">
        <ProjectEditorHeader isNew={isNew} />
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-muted-foreground">Loading project data...</div>
          </div>
        ) : (
          <div className="max-w-3xl">
            <ProjectEditorForm
              isNew={isNew}
              title={projectData.title}
              setTitle={projectData.setTitle}
              client={projectData.client}
              setClient={projectData.setClient}
              description={projectData.description}
              setDescription={projectData.setDescription}
              imageUrl={projectData.imageUrl}
              setImageUrl={projectData.setImageUrl}
              additionalImages={projectData.additionalImages}
              setAdditionalImages={projectData.setAdditionalImages}
              liveUrl={projectData.liveUrl}
              setLiveUrl={projectData.setLiveUrl}
              involvement={projectData.involvement}
              setInvolvement={projectData.setInvolvement}
              year={projectData.year}
              setYear={projectData.setYear}
              featured={projectData.featured}
              setFeatured={projectData.setFeatured}
              tags={projectData.tags}
              setTags={projectData.setTags}
              newTag={projectData.newTag}
              setNewTag={projectData.setNewTag}
              handleAddTag={handleAddTag}
              handleRemoveTag={handleRemoveTag}
              onCancel={handleCancel}
              onSubmit={handleSubmit}
              isSaving={isSaving}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectEditor;
