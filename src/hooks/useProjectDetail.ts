
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Project } from '@/components/project/ProjectCard';

interface ProjectWithImages extends Project {
  additionalImages?: string[];
  liveUrl?: string;
  involvement?: string;
  year?: number;
}

export const useProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<ProjectWithImages | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchProjectData = async () => {
      try {
        setLoading(true);
        
        // Fetch project data
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', id)
          .single();
          
        if (projectError) {
          console.error('Error fetching project:', projectError);
          setError('Failed to load project');
          setLoading(false);
          return;
        }
        
        if (!projectData) {
          setError('Project not found');
          setLoading(false);
          return;
        }
        
        // Fetch images/media
        const { data: imageData } = await supabase
          .from('project_images')
          .select('image_url, is_primary, display_order, media_type, video_thumbnail_url')
          .eq('project_id', id)
          .order('display_order', { ascending: true });
          
        let primaryImageUrl = '';
        let additionalImages: string[] = [];
          
        if (imageData && imageData.length > 0) {
          console.log('Fetched image data:', imageData);
          
          // Find primary image/media
          const primaryImage = imageData.find(img => img.is_primary);
          if (primaryImage) {
            // Create media object for primary image - use video_thumbnail_url for videos
            const primaryMedia = {
              url: primaryImage.image_url,
              type: primaryImage.media_type || 'image',
              // Use video_thumbnail_url for videos, image_url for images
              thumbnailUrl: primaryImage.media_type === 'video' 
                ? primaryImage.video_thumbnail_url
                : primaryImage.image_url
            };
            primaryImageUrl = JSON.stringify(primaryMedia);
            console.log('Primary media object:', primaryMedia);
          }
            
          // Get additional images/media (non-primary) - use video_thumbnail_url for videos
          additionalImages = imageData
            .filter(img => !img.is_primary)
            .map(img => {
              const media = {
                url: img.image_url,
                type: img.media_type || 'image',
                // Use video_thumbnail_url for videos, image_url for images
                thumbnailUrl: img.media_type === 'video' 
                  ? img.video_thumbnail_url
                  : img.image_url
              };
              console.log('Additional media object:', media);
              return JSON.stringify(media);
            });
        }
        
        // Fetch tags
        const { data: tagData } = await supabase
          .from('project_tags')
          .select('tags(name)')
          .eq('project_id', id);
        
        const tags = tagData ? tagData.map(item => item.tags.name) : [];
        
        // Create complete project object
        const completeProject: ProjectWithImages = {
          id: projectData.id,
          title: projectData.title,
          client: projectData.client,
          description: projectData.description,
          imageUrl: primaryImageUrl,
          additionalImages: additionalImages,
          tags: tags,
          createdAt: projectData.created_at,
          liveUrl: projectData.liveurl,
          involvement: projectData.involvement,
          year: projectData.year,
        };
        
        console.log('Complete project object:', completeProject);
        setProject(completeProject);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching project details:', err);
        setError('An unexpected error occurred');
        setLoading(false);
      }
    };
    
    fetchProjectData();
  }, [id]);

  return { project, loading, error };
};
