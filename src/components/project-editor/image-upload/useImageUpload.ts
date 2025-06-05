import { useState } from 'react';
import { toast } from 'sonner';
import { uploadFile } from './services/uploadService';
import { removeMediaFromDatabase } from './services/databaseService';

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

  // Function to handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      setIsUploading(true);
      
      const mediaItem = await uploadFile(file);
      if (!mediaItem) return;
      
      // Set the media URL
      if (!imageUrl) {
        // If no primary image, set this as primary
        setImageUrl(JSON.stringify(mediaItem));
      } else {
        // Otherwise add to additional images
        setAdditionalImages([...additionalImages, JSON.stringify(mediaItem)]);
      }
      
    } catch (error) {
      console.error('Error in upload process:', error);
      toast.error('Failed to process file');
    } finally {
      // Reset the file input
      e.target.value = '';
      setIsUploading(false);
    }
  };

  // Function to remove an additional image - now properly deletes from storage and database
  const handleRemoveAdditionalImage = async (index: number) => {
    try {
      const mediaString = additionalImages[index];
      
      // Remove from database and storage
      const success = await removeMediaFromDatabase(mediaString);
      
      if (success) {
        // Update local state
        const newImages = [...additionalImages];
        newImages.splice(index, 1);
        setAdditionalImages(newImages);
        
        toast.success('Media removed successfully');
      } else {
        toast.error('Failed to remove media');
      }
      
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
