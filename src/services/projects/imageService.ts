
import { supabase } from '@/integrations/supabase/client';

interface MediaItem {
  url: string;
  type: 'image' | 'video';
  thumbnailUrl?: string;
}

// Helper function to parse media item
const parseMediaItem = (mediaString: string): MediaItem => {
  try {
    const parsed = JSON.parse(mediaString);
    return {
      url: parsed.url || mediaString,
      type: parsed.type || 'image',
      thumbnailUrl: parsed.thumbnailUrl || parsed.url || mediaString
    };
  } catch {
    // Fallback for legacy image URLs
    return {
      url: mediaString,
      type: 'image',
      thumbnailUrl: mediaString
    };
  }
};

export async function saveProjectImages(
  projectId: string, 
  primaryImage: string, 
  additionalImages: string[] = []
): Promise<boolean> {
  try {
    // First, delete existing images
    const { error: deleteImagesError } = await supabase
      .from('project_images')
      .delete()
      .eq('project_id', projectId);
      
    if (deleteImagesError) {
      console.error('Error deleting existing images:', deleteImagesError);
      throw deleteImagesError;
    }
    
    // Save primary image if provided
    if (primaryImage) {
      const primaryMedia = parseMediaItem(primaryImage);
      
      const { error: primaryImageError } = await supabase
        .from('project_images')
        .insert({
          project_id: projectId,
          image_url: primaryMedia.url,
          is_primary: true,
          display_order: 0,
          media_type: primaryMedia.type,
          video_thumbnail_url: primaryMedia.type === 'video' ? primaryMedia.thumbnailUrl : null
        });
        
      if (primaryImageError) {
        console.error('Error saving primary image:', primaryImageError);
        throw primaryImageError;
      }
    }
    
    // Save additional images
    if (additionalImages && additionalImages.length > 0) {
      const additionalImagesData = additionalImages.map((mediaString, index) => {
        const media = parseMediaItem(mediaString);
        
        return {
          project_id: projectId,
          image_url: media.url,
          is_primary: false,
          display_order: index + 1,
          media_type: media.type,
          video_thumbnail_url: media.type === 'video' ? media.thumbnailUrl : null
        };
      });
      
      const { error: additionalImagesError } = await supabase
        .from('project_images')
        .insert(additionalImagesData);
        
      if (additionalImagesError) {
        console.error('Error saving additional images:', additionalImagesError);
        throw additionalImagesError;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error saving project images:', error);
    throw error;
  }
}
