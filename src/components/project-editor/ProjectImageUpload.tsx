
import React from 'react';
import { Label } from '@/components/ui/label';
import ImageUploadButton from './image-upload/ImageUploadButton';
import PrimaryImage from './image-upload/PrimaryImage';
import AdditionalImages from './image-upload/AdditionalImages';
import EmptyState from './image-upload/EmptyState';
import { useImageUpload } from './image-upload/useImageUpload';

interface ProjectImageUploadProps {
  imageUrl: string;
  setImageUrl: (value: string) => void;
  additionalImages: string[];
  setAdditionalImages: (value: string[]) => void;
}

const ProjectImageUpload = ({
  imageUrl,
  setImageUrl,
  additionalImages,
  setAdditionalImages
}: ProjectImageUploadProps) => {
  const {
    isUploading,
    handleFileUpload,
    handleRemoveAdditionalImage,
    handleMakePrimary
  } = useImageUpload({
    imageUrl,
    setImageUrl,
    additionalImages,
    setAdditionalImages
  });

  const hasImages = imageUrl || additionalImages.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Project Images</Label>
        <ImageUploadButton 
          onFileSelected={handleFileUpload}
          isUploading={isUploading}
        />
      </div>

      <div className="border rounded-md p-4">
        {hasImages ? (
          <div className="space-y-6">
            {/* Primary image */}
            {imageUrl && (
              <PrimaryImage
                imageUrl={imageUrl}
                onRemove={() => setImageUrl('')}
                onUpdate={setImageUrl}
              />
            )}

            {/* Additional images */}
            {additionalImages.length > 0 && (
              <AdditionalImages
                images={additionalImages}
                onRemove={handleRemoveAdditionalImage}
                onMakePrimary={handleMakePrimary}
                onUpdate={(index, value) => {
                  const updated = [...additionalImages];
                  updated[index] = value;
                  setAdditionalImages(updated);
                }}
                onReorder={setAdditionalImages}
                primaryImageUrl={imageUrl}
              />
            )}
          </div>
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
};

export default ProjectImageUpload;
