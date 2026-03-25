
import React from 'react';
import { Project } from '@/components/project/ProjectCard';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import ProjectBasicInfoFields from './ProjectBasicInfoFields';
import ProjectDescriptionField from './ProjectDescriptionField';
import ProjectImageUpload from './ProjectImageUpload';
import ProjectTagsField from './ProjectTagsField';
import ProjectUrlField from './ProjectUrlField';
import ProjectActions from './ProjectActions';

interface ProjectEditorFormProps {
  isNew: boolean;
  title: string;
  setTitle: (value: string) => void;
  client: string;
  setClient: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  imageUrl: string;
  setImageUrl: (value: string) => void;
  additionalImages: string[];
  setAdditionalImages: (value: string[]) => void;
  liveUrl: string;
  setLiveUrl: (value: string) => void;
  involvement: string;
  setInvolvement: (value: string) => void;
  year: number;
  setYear: (value: number) => void;
  featured: boolean;
  setFeatured: (value: boolean) => void;
  tags: string[];
  setTags: (tags: string[]) => void;
  newTag: string;
  setNewTag: (value: string) => void;
  handleAddTag: () => void;
  handleRemoveTag: (tag: string) => void;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => void;
  isSaving?: boolean;
}

const ProjectEditorForm = ({
  isNew,
  title,
  setTitle,
  client,
  setClient,
  description,
  setDescription,
  imageUrl,
  setImageUrl,
  additionalImages,
  setAdditionalImages,
  liveUrl,
  setLiveUrl,
  involvement,
  setInvolvement,
  year,
  setYear,
  featured,
  setFeatured,
  tags,
  setTags,
  newTag,
  setNewTag,
  handleAddTag,
  handleRemoveTag,
  onCancel,
  onSubmit,
  isSaving = false
}: ProjectEditorFormProps) => {
  return (
    <form onSubmit={onSubmit} className="space-y-6 bg-card shadow-sm border rounded-lg p-6">
      <ProjectBasicInfoFields
        title={title}
        setTitle={setTitle}
        client={client}
        setClient={setClient}
      />
      
      <ProjectDescriptionField 
        description={description} 
        setDescription={setDescription}
        involvement={involvement}
        setInvolvement={setInvolvement}
        year={year}
        setYear={setYear}
      />
      
      <div className="flex items-center gap-3">
        <Switch
          id="featured"
          checked={featured}
          onCheckedChange={setFeatured}
        />
        <Label htmlFor="featured" className="text-sm font-medium cursor-pointer">
          Feature on homepage
        </Label>
        {featured && (
          <span className="text-xs text-muted-foreground">
            This project will appear in the Selected Work section
          </span>
        )}
      </div>
      
      <ProjectUrlField
        liveUrl={liveUrl}
        setLiveUrl={setLiveUrl}
      />
      
      <ProjectImageUpload 
        imageUrl={imageUrl}
        setImageUrl={setImageUrl}
        additionalImages={additionalImages}
        setAdditionalImages={setAdditionalImages}
      />
      
      <ProjectTagsField
        tags={tags}
        newTag={newTag}
        setNewTag={setNewTag}
        handleAddTag={handleAddTag}
        handleRemoveTag={handleRemoveTag}
      />
      
      <ProjectActions
        isNew={isNew}
        onCancel={onCancel}
        onSubmit={onSubmit}
        isSaving={isSaving}
      />
    </form>
  );
};

export default ProjectEditorForm;
