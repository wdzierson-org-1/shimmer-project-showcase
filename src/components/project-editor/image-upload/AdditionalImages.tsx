
import React from 'react';
import { Button } from '@/components/ui/button';
import { X, Images } from 'lucide-react';

interface MediaItem {
  url: string;
  type: 'image' | 'video';
  thumbnailUrl?: string;
}

interface AdditionalImagesProps {
  images: string[];
  onRemove: (index: number) => void;
  onMakePrimary: (imageUrl: string, index: number) => void;
  primaryImageUrl: string;
}

const AdditionalImages = ({ 
  images, 
  onRemove, 
  onMakePrimary,
  primaryImageUrl 
}: AdditionalImagesProps) => {
  if (images.length === 0) return null;
  
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
  
  return (
    <div>
      <div className="text-sm text-muted-foreground mb-2">Additional Images</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {images.map((mediaString, index) => {
          const media = parseMediaItem(mediaString);
          
          return (
            <div key={index} className="relative group">
              <img 
                src={media.thumbnailUrl} 
                alt={`Additional ${media.type} ${index + 1}`} 
                className="w-full h-40 object-cover rounded-md"
                onError={(e) => {
                  console.error('Failed to load image:', media.thumbnailUrl);
                  // Try fallback to main URL
                  if (e.currentTarget.src !== media.url) {
                    e.currentTarget.src = media.url;
                  }
                }}
              />
              {media.type === 'video' && (
                <div className="absolute top-2 left-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                  Video
                </div>
              )}
              <div className="absolute -top-2 -right-2 flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="rounded-full"
                  onClick={() => onMakePrimary(primaryImageUrl, index)}
                  title="Make primary"
                >
                  <Images className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="rounded-full"
                  onClick={() => onRemove(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdditionalImages;
