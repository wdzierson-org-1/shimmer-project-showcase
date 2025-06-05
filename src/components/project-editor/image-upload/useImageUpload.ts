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

  // Function to generate video thumbnail
  const generateVideoThumbnail = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      video.onloadedmetadata = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        video.currentTime = 1; // Seek to 1 second for thumbnail
      };
      
      video.onseeked = () => {
        if (context) {
          context.drawImage(video, 0, 0);
          const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.8);
          resolve(thumbnailDataUrl);
        }
      };
      
      video.src = URL.createObjectURL(file);
    });
  };

  // Function to upload thumbnail to Supabase
  const uploadThumbnail = async (thumbnailDataUrl: string, fileName: string): Promise<string> => {
    // Convert data URL to blob
    const response = await fetch(thumbnailDataUrl);
    const blob = await response.blob();
    
    const thumbnailFileName = `thumbnails/${fileName.split('.')[0]}_thumbnail.jpg`;
    
    const { error } = await supabase.storage
      .from('project_images')
      .upload(thumbnailFileName, blob, {
        contentType: 'image/jpeg',
        upsert: true,
      });
      
    if (error) {
      console.error('Error uploading thumbnail:', error);
      throw error;
    }
    
    const { data: publicUrlData } = supabase.storage
      .from('project_images')
      .getPublicUrl(thumbnailFileName);
      
    return publicUrlData.publicUrl;
  };

  // Function to handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file size (50MB limit for videos, 5MB for images)
    const isVideo = file.type.startsWith('video/');
    const maxSize = isVideo ? 50 * 1024 * 1024 : 5 * 1024 * 1024;
    
    if (file.size > maxSize) {
      toast.error(`File size exceeds ${isVideo ? '50MB' : '5MB'} limit`);
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
      
      let thumbnailUrl = '';
      
      // Generate and upload thumbnail for videos
      if (isVideo) {
        try {
          const thumbnailDataUrl = await generateVideoThumbnail(file);
          thumbnailUrl = await uploadThumbnail(thumbnailDataUrl, fileName);
        } catch (error) {
          console.error('Error generating video thumbnail:', error);
          toast.warning('Video uploaded but thumbnail generation failed');
        }
      }
      
      // Create media object
      const mediaItem = {
        url: publicUrlData.publicUrl,
        type: isVideo ? 'video' : 'image',
        thumbnailUrl: thumbnailUrl || publicUrlData.publicUrl
      };
      
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

  // Function to remove an additional image
  const handleRemoveAdditionalImage = (index: number) => {
    const newImages = [...additionalImages];
    newImages.splice(index, 1);
    setAdditionalImages(newImages);
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
