
import { supabase } from '@/integrations/supabase/client';

// Function to generate video thumbnail with better error handling
export const generateVideoThumbnail = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    // Set video properties for better compatibility
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    
    video.onloadedmetadata = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      // Seek to 1 second or 10% of duration, whichever is smaller
      const seekTime = Math.min(1, video.duration * 0.1);
      video.currentTime = seekTime;
    };
    
    video.onseeked = () => {
      if (context) {
        try {
          context.drawImage(video, 0, 0);
          const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.8);
          console.log('Generated thumbnail for video:', thumbnailDataUrl.substring(0, 100) + '...');
          resolve(thumbnailDataUrl);
        } catch (error) {
          console.error('Error drawing video frame:', error);
          reject(error);
        }
      } else {
        reject(new Error('Canvas context not available'));
      }
      
      // Clean up
      URL.revokeObjectURL(video.src);
    };
    
    video.onerror = (error) => {
      console.error('Video loading error:', error);
      URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video for thumbnail generation'));
    };
    
    video.onloadstart = () => {
      console.log('Started loading video for thumbnail generation');
    };
    
    // Create object URL and set as video source
    const videoUrl = URL.createObjectURL(file);
    video.src = videoUrl;
    video.load();
  });
};

// Function to upload thumbnail to Supabase
export const uploadThumbnail = async (thumbnailDataUrl: string, fileName: string): Promise<string> => {
  try {
    // Convert data URL to blob
    const response = await fetch(thumbnailDataUrl);
    const blob = await response.blob();
    
    const thumbnailFileName = `thumbnails/${fileName.split('.')[0]}_thumbnail.jpg`;
    
    const { error: uploadError } = await supabase.storage
      .from('project_images')
      .upload(thumbnailFileName, blob, {
        contentType: 'image/jpeg',
        upsert: true,
      });
      
    if (uploadError) {
      console.error('Error uploading thumbnail:', uploadError);
      throw uploadError;
    }
    
    // Get the public URL - this should now work with the updated bucket permissions
    const { data: publicUrlData } = supabase.storage
      .from('project_images')
      .getPublicUrl(thumbnailFileName);
      
    console.log('Uploaded thumbnail to:', publicUrlData.publicUrl);
    
    // Add a cache buster to ensure the image loads fresh
    const publicUrlWithCacheBuster = `${publicUrlData.publicUrl}?t=${Date.now()}`;
    console.log('Thumbnail URL with cache buster:', publicUrlWithCacheBuster);
    
    return publicUrlWithCacheBuster;
  } catch (error) {
    console.error('Error in uploadThumbnail:', error);
    throw error;
  }
};
