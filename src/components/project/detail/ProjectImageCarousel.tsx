
import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';

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
      // Embed the video directly
      return (
        <video 
          key={key}
          src={media.url} 
          className="w-full h-auto object-cover rounded-md"
          controls
          autoPlay
          muted
          loop
          onError={(e) => {
            console.error('Failed to load video:', media.url);
            console.error('Video error event:', e);
          }}
          onLoadedData={() => {
            console.log('Successfully loaded video:', media.url);
          }}
        >
          Your browser does not support the video tag.
        </video>
      );
    }
    
    // For images, use the thumbnailUrl if available, otherwise use url
    const displayUrl = media.thumbnailUrl || media.url;
    
    console.log(`Using display URL for ${key}:`, displayUrl);
    
    return (
      <img 
        key={key}
        src={displayUrl} 
        alt={index !== undefined ? `${title} - ${index + 1}` : title} 
        className="w-full h-auto object-cover rounded-md"
        onError={(e) => {
          console.error('Failed to load image:', displayUrl);
          console.error('Media object was:', media);
        }}
        onLoad={() => {
          console.log('Successfully loaded image:', displayUrl);
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
