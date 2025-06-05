import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';

export interface ProjectFormData {
  title: string;
  client: string;
  description: string;
  imageUrl: string;
  additionalImages: string[];
  liveUrl: string;
  involvement: string;
  year: number;
  tags: string[];
  newTag: string;
}

export const useProjectData = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const isNew = id === 'new';
  
  // State for project data
  const [title, setTitle] = useState('');
  const [client, setClient] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [additionalImages, setAdditionalImages] = useState<string[]>([]);
  const [liveUrl, setLiveUrl] = useState('');
  const [involvement, setInvolvement] = useState('');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [loading, setLoading] = useState(true);
  
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
        
        // Fetch project data
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', id)
          .single();
        
        if (projectError) {
          console.error('Error fetching project:', projectError);
          throw projectError;
        }
        
        if (!projectData) {
          toast.error('Project not found');
          navigate('/admin/projects');
          return;
        }
        
        console.log('Project data loaded:', projectData);
        
        // Set project basic data
        setTitle(projectData.title);
        setClient(projectData.client);
        setDescription(projectData.description);
        
        // Set year if available, otherwise default to current year
        setYear(projectData.year || new Date().getFullYear());
        
        // Fetch images
        const { data: imageData } = await supabase
          .from('project_images')
          .select('image_url, is_primary, display_order, media_type, video_thumbnail_url')
          .eq('project_id', id)
          .order('display_order', { ascending: true });
          
        if (imageData && imageData.length > 0) {
          console.log('Fetched image data for editing:', imageData);
          
          // Find primary image
          const primaryImage = imageData.find(img => img.is_primary);
          if (primaryImage) {
            // Create media object for primary image
            const primaryMedia = {
              url: primaryImage.image_url,
              type: primaryImage.media_type || 'image',
              // For videos, use video_thumbnail_url if available, otherwise fallback to image_url
              thumbnailUrl: primaryImage.media_type === 'video' && primaryImage.video_thumbnail_url 
                ? primaryImage.video_thumbnail_url 
                : primaryImage.image_url
            };
            setImageUrl(JSON.stringify(primaryMedia));
            console.log('Primary media object for editing:', primaryMedia);
          }
          
          // Get additional images (non-primary)
          const additionalImgs = imageData
            .filter(img => !img.is_primary)
            .map(img => {
              const media = {
                url: img.image_url,
                type: img.media_type || 'image',
                // For videos, use video_thumbnail_url if available, otherwise fallback to image_url
                thumbnailUrl: img.media_type === 'video' && img.video_thumbnail_url 
                  ? img.video_thumbnail_url 
                  : img.image_url
              };
              console.log('Additional media object for editing:', media);
              return JSON.stringify(media);
            });
            
          setAdditionalImages(additionalImgs);
        }
        
        // Fetch tags
        const { data: tagData } = await supabase
          .from('project_tags')
          .select('tags(name)')
          .eq('project_id', id);
          
        if (tagData && tagData.length > 0) {
          const tagNames = tagData.map(item => item.tags.name);
          setTags(tagNames);
        }
        
        // Set live URL if available
        if (projectData.liveurl) {
          setLiveUrl(projectData.liveurl);
        }
        
        // Set involvement if available
        if (projectData.involvement) {
          setInvolvement(projectData.involvement);
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

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };
  
  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };
  
  // Helper function to validate UUID format
  const isValidUUID = (uuid: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  };
  
  return {
    isNew,
    id,
    loading,
    projectData: {
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
      tags,
      setTags,
      newTag,
      setNewTag
    },
    handleAddTag,
    handleRemoveTag,
    navigate
  };
};
