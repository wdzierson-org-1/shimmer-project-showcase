
import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface UseImageUploadProps {
  imageUrl: string;
  setImageUrl: (url: string) => void;
  additionalImages: string[];
  setAdditionalImages: (images: string[]) => void;
}

export const useImageUpload = ({
  imageUrl,
  setImageUrl,
  additionalImages,
  setAdditionalImages
}: UseImageUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);

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

  // Function to generate video thumbnail with better error handling
  const generateVideoThumbnail = (file: File): Promise<string> => {
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
  const uploadThumbnail = async (thumbnailDataUrl: string, fileName: string): Promise<string> => {
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

  // Function to handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file size (100MB limit for videos, 5MB for images)
    const isVideo = file.type.startsWith('video/');
    const maxSize = isVideo ? 100 * 1024 * 1024 : 5 * 1024 * 1024;
    
    if (file.size > maxSize) {
      toast.error(`File size exceeds ${isVideo ? '100MB' : '5MB'} limit`);
      return;
    }
    
    // Check file type
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/webp',
      'video/mp4', 'video/webm', 'video/quicktime'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      toast.error('File must be PNG, JPG, WebP, MP4, WebM, or MOV format');
      return;
    }
    
    try {
      setIsUploading(true);
      toast.info(`Uploading ${isVideo ? 'video' : 'image'}...`);
      
      // Generate a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `${fileName}`;
      
      // Upload main file to Supabase Storage
      const { data, error } = await supabase.storage
        .from('project_images')
        .upload(filePath, file, {
          contentType: file.type,
          upsert: true,
        });
        
      if (error) {
        console.error('Error uploading file:', error);
        toast.error(`Failed to upload ${isVideo ? 'video' : 'image'}`);
        return;
      }
      
      // Get the public URL
      const { data: publicUrlData } = supabase.storage
        .from('project_images')
        .getPublicUrl(filePath);
      
      console.log('Uploaded file to:', publicUrlData.publicUrl);
      
      let thumbnailUrl = '';
      
      // Generate and upload thumbnail for videos
      if (isVideo) {
        try {
          console.log('Generating thumbnail for video...');
          const thumbnailDataUrl = await generateVideoThumbnail(file);
          thumbnailUrl = await uploadThumbnail(thumbnailDataUrl, fileName);
          console.log('Successfully generated and uploaded thumbnail:', thumbnailUrl);
        } catch (error) {
          console.error('Error generating video thumbnail:', error);
          toast.warning('Video uploaded but thumbnail generation failed');
          // Use video URL as fallback thumbnail
          thumbnailUrl = publicUrlData.publicUrl;
        }
      }
      
      // Create media object
      const mediaItem = {
        url: publicUrlData.publicUrl,
        type: isVideo ? 'video' : 'image',
        thumbnailUrl: thumbnailUrl || publicUrlData.publicUrl
      };
      
      console.log('Created media item:', mediaItem);
      
      // Set the media URL
      if (!imageUrl) {
        // If no primary image, set this as primary
        setImageUrl(JSON.stringify(mediaItem));
      } else {
        // Otherwise add to additional images
        setAdditionalImages([...additionalImages, JSON.stringify(mediaItem)]);
      }
      
      toast.success(`${isVideo ? 'Video' : 'Image'} uploaded successfully`);
      
    } catch (error) {
      console.error('Error in upload process:', error);
      toast.error(`Failed to process ${isVideo ? 'video' : 'image'}`);
    } finally {
      // Reset the file input
      e.target.value = '';
      setIsUploading(false);
    }
  };

  // Function to remove an additional image - now properly deletes from storage
  const handleRemoveAdditionalImage = async (index: number) => {
    try {
      const mediaString = additionalImages[index];
      let mediaItem;
      
      try {
        mediaItem = JSON.parse(mediaString);
      } catch {
        // Handle legacy URL format
        mediaItem = { url: mediaString, type: 'image', thumbnailUrl: mediaString };
      }
      
      console.log('Removing media item:', mediaItem);
      
      // Extract file paths for deletion
      const mainFilePath = extractFilePathFromUrl(mediaItem.url);
      const thumbnailFilePath = mediaItem.thumbnailUrl !== mediaItem.url 
        ? extractFilePathFromUrl(mediaItem.thumbnailUrl) 
        : null;
      
      // Delete main file from storage
      if (mainFilePath) {
        await deleteFileFromStorage(mainFilePath);
      }
      
      // Delete thumbnail file from storage if it's different from main file
      if (thumbnailFilePath) {
        await deleteFileFromStorage(thumbnailFilePath);
      }
      
      // Update local state
      const newImages = [...additionalImages];
      newImages.splice(index, 1);
      setAdditionalImages(newImages);
      
      toast.success('Media removed successfully');
      
    } catch (error) {
      console.error('Error removing media:', error);
      toast.error('Failed to remove media');
    }
  };

  // Function to make an additional image the primary image
  const handleMakePrimary = (currentPrimaryUrl: string, index: number) => {
    // Add current primary to additional images
    const newAdditionalImages = [...additionalImages];
    if (currentPrimaryUrl) {
      newAdditionalImages.push(currentPrimaryUrl);
    }
    
    // Remove the selected image from additional
    newAdditionalImages.splice(index, 1);
    
    // Set the selected image as primary
    setImageUrl(additionalImages[index]);
    setAdditionalImages(newAdditionalImages);
    toast.success('Set as primary media');
  };

  return {
    isUploading,
    handleFileUpload,
    handleRemoveAdditionalImage,
    handleMakePrimary
  };
};
