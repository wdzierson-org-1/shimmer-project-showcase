
import { supabase } from '@/integrations/supabase/client';
import { extractFilePathFromUrl, deleteFileFromStorage, deleteThumbnailFromStorage } from '../utils/fileUtils';

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

export const removeMediaFromDatabase = async (mediaString: string): Promise<boolean> => {
  try {
    console.log('Removing media from database:', mediaString);
    
    const media = parseMediaItem(mediaString);
    
    // Extract file paths for deletion
    const mainFilePath = extractFilePathFromUrl(media.url);
    
    let success = true;
    
    // Delete main file
    if (mainFilePath) {
      const mainFileDeleted = await deleteFileFromStorage(mainFilePath);
      if (!mainFileDeleted) {
        console.warn('Failed to delete main file:', mainFilePath);
        success = false;
      }
    }
    
    // If it's a video, also delete the thumbnail
    if (media.type === 'video' && mainFilePath) {
      const thumbnailDeleted = await deleteThumbnailFromStorage(mainFilePath);
      if (!thumbnailDeleted) {
        console.warn('Failed to delete thumbnail for video:', mainFilePath);
        // Don't mark as complete failure since main file might be deleted
      }
    }
    
    // If there's a separate thumbnail URL (different from main URL), delete it too
    if (media.thumbnailUrl && media.thumbnailUrl !== media.url) {
      const thumbnailPath = extractFilePathFromUrl(media.thumbnailUrl);
      if (thumbnailPath) {
        const thumbnailDeleted = await deleteFileFromStorage(thumbnailPath);
        if (!thumbnailDeleted) {
          console.warn('Failed to delete separate thumbnail:', thumbnailPath);
        }
      }
    }
    
    return success;
  } catch (error) {
    console.error('Error in removeMediaFromDatabase:', error);
    return false;
  }
};
