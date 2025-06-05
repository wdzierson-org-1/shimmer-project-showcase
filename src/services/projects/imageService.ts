
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

// Helper function to extract file path from URL
const extractFilePathFromUrl = (url: string): string | null => {
  try {
    const urlObj = new URL(url);
    const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/project_images\/(.+)$/);
    return pathMatch ? pathMatch[1] : null;
  } catch {
    return null;
  }
};

// Helper function to delete file from storage
const deleteFileFromStorage = async (filePath: string): Promise<boolean> => {
  try {
    const { error } = await supabase.storage
      .from('project_images')
      .remove([filePath]);
      
    if (error) {
      console.error('Error deleting file from storage:', error);
      return false;
    }
    
    console.log('Successfully deleted file from storage:', filePath);
    return true;
  } catch (error) {
    console.error('Error in deleteFileFromStorage:', error);
    return false;
  }
};

export async function saveProjectImages(
  projectId: string, 
  primaryImage: string, 
  additionalImages: string[] = []
): Promise<boolean> {
  try {
    // Get existing images to clean up files that are no longer used
    const { data: existingImages } = await supabase
      .from('project_images')
      .select('image_url, video_thumbnail_url')
      .eq('project_id', projectId);
    
    // Collect all current image URLs (new primary + additional)
    const currentImageUrls = new Set<string>();
    
    if (primaryImage) {
      const primaryMedia = parseMediaItem(primaryImage);
      currentImageUrls.add(primaryMedia.url);
      if (primaryMedia.thumbnailUrl && primaryMedia.thumbnailUrl !== primaryMedia.url) {
        currentImageUrls.add(primaryMedia.thumbnailUrl);
      }
    }
    
    additionalImages.forEach(mediaString => {
      const media = parseMediaItem(mediaString);
      currentImageUrls.add(media.url);
      if (media.thumbnailUrl && media.thumbnailUrl !== media.url) {
        currentImageUrls.add(media.thumbnailUrl);
      }
    });
    
    // Delete files that are no longer being used
    if (existingImages) {
      for (const existingImage of existingImages) {
        // Check main image URL
        if (existingImage.image_url && !currentImageUrls.has(existingImage.image_url)) {
          const filePath = extractFilePathFromUrl(existingImage.image_url);
          if (filePath) {
            await deleteFileFromStorage(filePath);
          }
        }
        
        // Check thumbnail URL
        if (existingImage.video_thumbnail_url && !currentImageUrls.has(existingImage.video_thumbnail_url)) {
          const thumbnailPath = extractFilePathFromUrl(existingImage.video_thumbnail_url);
          if (thumbnailPath) {
            await deleteFileFromStorage(thumbnailPath);
          }
        }
      }
    }
    
    // Delete existing image records
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
