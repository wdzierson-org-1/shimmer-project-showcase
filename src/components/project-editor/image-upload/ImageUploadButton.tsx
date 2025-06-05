
import React from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Loader2 } from 'lucide-react';

interface ImageUploadButtonProps {
  onFileSelected: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isUploading: boolean;
}

const ImageUploadButton = ({ onFileSelected, isUploading }: ImageUploadButtonProps) => {
  return (
    <div>
      <input
        type="file"
        id="file-upload"
        className="hidden"
        onChange={onFileSelected}
        accept="image/*,video/*"
        disabled={isUploading}
      />
      <label htmlFor="file-upload">
        <Button 
          variant="outline" 
          size="sm" 
          disabled={isUploading}
          className="cursor-pointer"
          asChild
        >
          <span>
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Add Media
              </>
            )}
          </span>
        </Button>
      </label>
    </div>
  );
};

export default ImageUploadButton;
