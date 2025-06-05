
import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { ExternalLink, Play } from 'lucide-react';

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
      // Fallback for legacy image URLs - check file extension for video
      const isVideo = mediaString.toLowerCase().match(/\.(mp4|mov|avi|webm)$/);
      return {
        url: mediaString,
        type: isVideo ? 'video' : 'image',
        thumbnailUrl: mediaString
      };
    }
  };

  // Parse main media item
  const mainMedia = mainImageUrl ? parseMediaItem(mainImageUrl) : null;
  
  // Parse additional media items
  const additionalMedia = additionalImages?.map(parseMediaItem).filter(media => media.url) || [];
  
  // Find all video files
  const allMedia = [mainMedia, ...additionalMedia].filter(Boolean) as MediaItem[];
  const videoFiles = allMedia.filter(media => media.type === 'video' || media.url.toLowerCase().match(/\.(mp4|mov|avi|webm)$/));
  
  const hasAdditionalMedia = additionalMedia.length > 0;
  
  const renderMediaItem = (media: MediaItem, index?: number) => {
    const key = index !== undefined ? `additional-media-${index}` : 'main-media';
    
    console.log(`ProjectImageCarousel rendering ${key}:`, media);
    
    // For videos, show thumbnail with play button overlay
    if (media.type === 'video' || media.url.toLowerCase().match(/\.(mp4|mov|avi|webm)$/)) {
      const displayUrl = media.thumbnailUrl || media.url;
      
      console.log(`Using thumbnail URL for video ${key}:`, displayUrl);
      
      return (
        <div key={key} className="relative cursor-pointer" onClick={() => window.open(media.url, '_blank')}>
          <img 
            src={displayUrl} 
            alt={index !== undefined ? `${title} - Video ${index + 1}` : `${title} - Video`} 
            className="w-full h-auto object-cover rounded-md"
            onError={(e) => {
              console.error('Failed to load video thumbnail:', displayUrl);
              console.error('Media object was:', media);
            }}
            onLoad={() => {
              console.log('Successfully loaded video thumbnail:', displayUrl);
            }}
          />
          {/* Play button overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-black bg-opacity-50 rounded-full p-4 transition-transform hover:scale-110">
              <Play size={32} className="text-white fill-white" />
            </div>
          </div>
          {/* Video indicator */}
          <div className="absolute top-2 left-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
            Video
          </div>
        </div>
      );
    }
    
    // For images, use the thumbnailUrl if available, otherwise use url
    const displayUrl = media.thumbnailUrl || media.url;
    
    console.log(`Using display URL for image ${key}:`, displayUrl);
    
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
