
import React from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface MediaItem {
  url: string;
  type: 'image' | 'video';
  thumbnailUrl?: string;
}

interface PrimaryImageProps {
  imageUrl: string;
  onRemove: () => void;
}

const PrimaryImage = ({ imageUrl, onRemove }: PrimaryImageProps) => {
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

  const media = parseMediaItem(imageUrl);

  return (
    <div>
      <div className="text-sm text-muted-foreground mb-2">Primary Image</div>
      <div className="relative group">
        <img 
          src={media.thumbnailUrl} 
          alt="Primary media" 
          className="w-full h-64 object-cover rounded-md"
          onError={(e) => {
            console.error('Failed to load primary image:', media.thumbnailUrl);
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
        <Button
          type="button"
          variant="destructive"
          size="icon"
          className="absolute -top-2 -right-2 rounded-full"
          onClick={onRemove}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default PrimaryImage;
