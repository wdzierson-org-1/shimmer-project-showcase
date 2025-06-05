
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

// Function to upload thumbnail to the same bucket as other images with thumbnail_ prefix
export const uploadThumbnail = async (thumbnailDataUrl: string, fileName: string): Promise<string> => {
  try {
    // Convert data URL to blob
    const response = await fetch(thumbnailDataUrl);
    const blob = await response.blob();
    
    // Store thumbnail in the same bucket with thumbnail_ prefix
    const thumbnailFileName = `thumbnail_${fileName.split('.')[0]}.jpg`;
    
    console.log('Uploading thumbnail to path:', thumbnailFileName);
    
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
    
    // Get the public URL - same bucket as other images
    const { data: publicUrlData } = supabase.storage
      .from('project_images')
      .getPublicUrl(thumbnailFileName);
      
    console.log('Generated thumbnail public URL:', publicUrlData.publicUrl);
    
    // Verify the URL is accessible by making a HEAD request
    try {
      const testResponse = await fetch(publicUrlData.publicUrl, { method: 'HEAD' });
      console.log('Thumbnail URL accessibility test:', testResponse.status, testResponse.statusText);
      
      if (!testResponse.ok) {
        console.warn('Thumbnail URL may not be accessible:', testResponse.status);
      }
    } catch (testError) {
      console.warn('Could not test thumbnail URL accessibility:', testError);
    }
    
    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('Error in uploadThumbnail:', error);
    throw error;
  }
};
