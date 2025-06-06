
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ProjectFormData } from '@/types/projectData';
import { useProjectDataState } from '@/hooks/useProjectDataState';
import { useTagHandlers } from '@/hooks/useTagHandlers';
import { isValidUUID } from '@/utils/projectValidation';
import { 
  fetchProjectBasicData, 
  fetchProjectImages, 
  fetchProjectTags, 
  processImageData 
} from '@/services/projectDataService';

export const useProjectData = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const isNew = id === 'new';
  const [loading, setLoading] = useState(true);
  
  // Use the state management hook
  const projectDataState = useProjectDataState();
  
  // Use the tag handlers hook
  const { handleAddTag, handleRemoveTag } = useTagHandlers(
    projectDataState.tags,
    projectDataState.setTags,
    projectDataState.newTag,
    projectDataState.setNewTag
  );
  
  // Load existing project data if editing
  useEffect(() => {
    const fetchProjectData = async () => {
      if (isNew) {
        setLoading(false);
        return;
      }
      
      try {
        // Validate that the ID is in UUID format
        if (!isValidUUID(id)) {
          console.error('Invalid project ID format:', id);
          toast.error('Invalid project ID format');
          navigate('/admin/projects');
          return;
        }
        
        console.log('Fetching project data for ID:', id);
        
        // Fetch project basic data
        const projectData = await fetchProjectBasicData(id);
        
        if (!projectData) {
          toast.error('Project not found');
          navigate('/admin/projects');
          return;
        }
        
        console.log('Project data loaded:', projectData);
        
        // Set project basic data
        projectDataState.setTitle(projectData.title);
        projectDataState.setClient(projectData.client);
        projectDataState.setDescription(projectData.description);
        
        // Set year if available, otherwise default to current year
        projectDataState.setYear(projectData.year || new Date().getFullYear());
        
        // Fetch and process images
        const imageData = await fetchProjectImages(id);
        const { primaryImageUrl, additionalImages } = processImageData(imageData);
        
        if (primaryImageUrl) {
          projectDataState.setImageUrl(primaryImageUrl);
        }
        projectDataState.setAdditionalImages(additionalImages);
        
        // Fetch tags
        const tagNames = await fetchProjectTags(id);
        projectDataState.setTags(tagNames);
        
        // Set live URL if available
        if (projectData.liveurl) {
          projectDataState.setLiveUrl(projectData.liveurl);
        }
        
        // Set involvement if available
        if (projectData.involvement) {
          projectDataState.setInvolvement(projectData.involvement);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching project:', error);
        toast.error('Failed to load project data');
        setLoading(false);
      }
    };
    
    fetchProjectData();
  }, [id, isNew, navigate]);
  
  return {
    isNew,
    id,
    loading,
    projectData: projectDataState,
    handleAddTag,
    handleRemoveTag,
    navigate
  };
};
