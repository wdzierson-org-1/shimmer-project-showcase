
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ProjectDataFromDB {
  id: string;
  title: string;
  client: string;
  description: string;
  year?: number;
  liveurl?: string;
  involvement?: string;
}

export interface ProjectImageData {
  image_url: string;
  is_primary: boolean;
  display_order: number;
  media_type?: string;
  video_thumbnail_url?: string;
}

export interface ProjectTagData {
  tags: { name: string };
}

export const fetchProjectBasicData = async (id: string): Promise<ProjectDataFromDB | null> => {
  const { data: projectData, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single();
  
  if (projectError) {
    console.error('Error fetching project:', projectError);
    throw projectError;
  }
  
  return projectData;
};

export const fetchProjectImages = async (id: string): Promise<ProjectImageData[]> => {
  const { data: imageData } = await supabase
    .from('project_images')
    .select('image_url, is_primary, display_order, media_type, video_thumbnail_url')
    .eq('project_id', id)
    .order('display_order', { ascending: true });
    
  return imageData || [];
};

export const fetchProjectTags = async (id: string): Promise<string[]> => {
  const { data: tagData } = await supabase
    .from('project_tags')
    .select('tags(name)')
    .eq('project_id', id);
    
  return tagData ? tagData.map((item: ProjectTagData) => item.tags.name) : [];
};

export const processImageData = (imageData: ProjectImageData[]): { primaryImageUrl: string; additionalImages: string[] } => {
  let primaryImageUrl = '';
  let additionalImages: string[] = [];
  
  if (imageData.length > 0) {
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
      primaryImageUrl = JSON.stringify(primaryMedia);
      console.log('Primary media object for editing:', primaryMedia);
    }
    
    // Get additional images (non-primary)
    additionalImages = imageData
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
  }
  
  return { primaryImageUrl, additionalImages };
};
