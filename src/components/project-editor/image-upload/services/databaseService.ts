
import { supabase } from '@/integrations/supabase/client';
import { extractFilePathFromUrl, deleteFileFromStorage } from '../utils/fileUtils';

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

// Function to remove media from database and storage
export const removeMediaFromDatabase = async (mediaString: string): Promise<boolean> => {
  try {
    const mediaItem = parseMediaItem(mediaString);
    
    console.log('Removing media item from database:', mediaItem);
    
    // Extract file paths for deletion
    const mainFilePath = extractFilePathFromUrl(mediaItem.url);
    const thumbnailFilePath = mediaItem.thumbnailUrl !== mediaItem.url 
      ? extractFilePathFromUrl(mediaItem.thumbnailUrl || '') 
      : null;
    
    // Delete from project_images table
    if (mainFilePath) {
      const { error: dbError } = await supabase
        .from('project_images')
        .delete()
        .eq('image_url', mediaItem.url);
        
      if (dbError) {
        console.error('Error deleting from database:', dbError);
        return false;
      }
    }
    
    // Delete main file from storage
    if (mainFilePath) {
      await deleteFileFromStorage(mainFilePath);
    }
    
    // Delete thumbnail file from storage if it's different from main file
    if (thumbnailFilePath) {
      await deleteFileFromStorage(thumbnailFilePath);
    }
    
    return true;
    
  } catch (error) {
    console.error('Error removing media from database:', error);
    return false;
  }
};
