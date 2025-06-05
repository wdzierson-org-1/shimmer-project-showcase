
import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import VideoPlayer from './VideoPlayer';

interface MediaItem {
  url: string;
  type: 'image' | 'video';
  thumbnailUrl?: string;
}

interface ProjectImageCarouselProps {
  mainImageUrl: string;
  additionalImages?: string[];
  title: string;
}

const ProjectImageCarousel: React.FC<ProjectImageCarouselProps> = ({ 
  mainImageUrl, 
  additionalImages, 
  title 
}) => {
  // Helper function to parse media item
  const parseMediaItem = (mediaString: string): MediaItem => {
    if (!mediaString) {
      return { url: '', type: 'image', thumbnailUrl: '' };
    }
    
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

  // Parse main media item
  const mainMedia = mainImageUrl ? parseMediaItem(mainImageUrl) : null;
  
  // Parse additional media items
  const additionalMedia = additionalImages?.map(parseMediaItem).filter(media => media.url) || [];
  
  const hasAdditionalMedia = additionalMedia.length > 0;
  
  const renderMediaItem = (media: MediaItem, index?: number) => {
    const key = index !== undefined ? `additional-media-${index}` : 'main-media';
    
    console.log(`ProjectImageCarousel rendering ${key}:`, media);
    
    if (media.type === 'video') {
      // For videos, always ensure we have a proper thumbnail URL
      const thumbnailUrl = media.thumbnailUrl && media.thumbnailUrl !== media.url ? media.thumbnailUrl : media.url;
      
      return (
        <VideoPlayer
          key={key}
          videoUrl={media.url}
          thumbnailUrl={thumbnailUrl}
          title={title}
        />
      );
    }
    
    return (
      <img 
        key={key}
        src={media.url} 
        alt={index !== undefined ? `${title} - ${index + 1}` : title} 
        className="w-full h-auto object-cover rounded-md"
        onError={(e) => {
          console.error('Failed to load image:', media.url);
        }}
        onLoad={() => {
          console.log('Successfully loaded image:', media.url);
        }}
      />
    );
  };
  
  return (
    <ScrollArea className="h-[calc(100vh-200px)]">
      <div className="space-y-4">
        {/* Main media */}
        {mainMedia && mainMedia.url && (
          <div>
            {renderMediaItem(mainMedia)}
          </div>
        )}
        
        {/* Additional media */}
        {hasAdditionalMedia && additionalMedia.map((media, index) => (
          <div key={`additional-media-${index}`} className="pt-4">
            {renderMediaItem(media, index)}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};

export default ProjectImageCarousel;
