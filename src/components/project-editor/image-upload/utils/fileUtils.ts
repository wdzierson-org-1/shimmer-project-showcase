
import { supabase } from '@/integrations/supabase/client';

// Helper function to extract file path from URL
export const extractFilePathFromUrl = (url: string): string | null => {
  try {
    const urlObj = new URL(url);
    const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/project_images\/(.+)$/);
    return pathMatch ? pathMatch[1] : null;
  } catch {
    return null;
  }
};

// Helper function to delete file from storage
export const deleteFileFromStorage = async (filePath: string): Promise<boolean> => {
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

// Helper function to delete thumbnail file when deleting a video
export const deleteThumbnailFromStorage = async (videoFileName: string): Promise<boolean> => {
  try {
    // Extract the base filename without extension
    const baseFileName = videoFileName.split('.')[0];
    const thumbnailFileName = `thumbnail_${baseFileName}.jpg`;
    
    console.log('Attempting to delete thumbnail:', thumbnailFileName);
    
    const { error } = await supabase.storage
      .from('project_images')
      .remove([thumbnailFileName]);
      
    if (error) {
      console.error('Error deleting thumbnail from storage:', error);
      return false;
    }
    
    console.log('Successfully deleted thumbnail from storage:', thumbnailFileName);
    return true;
  } catch (error) {
    console.error('Error in deleteThumbnailFromStorage:', error);
    return false;
  }
};

// Helper function to validate file type and size
export const validateFile = (file: File): { isValid: boolean; error?: string } => {
  const isVideo = file.type.startsWith('video/');
  const isPdf = file.type === 'application/pdf';
  const maxSize = isVideo ? 100 * 1024 * 1024 : isPdf ? 50 * 1024 * 1024 : 5 * 1024 * 1024; // 100MB for videos, 50MB for PDFs, 5MB for images
  
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: `File size exceeds ${isVideo ? '100MB' : isPdf ? '50MB' : '5MB'} limit`
    };
  }
  
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/webp',
    'video/mp4', 'video/webm', 'video/quicktime',
    'application/pdf'
  ];
  
  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: 'File must be PNG, JPG, WebP, MP4, WebM, MOV, or PDF format'
    };
  }
  
  return { isValid: true };
};
