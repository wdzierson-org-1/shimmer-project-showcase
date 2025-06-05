
import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

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
    
    // Always render as image for now, videos will be linked separately
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
        
        {/* Video links */}
        {videoFiles.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Videos:</h4>
            {videoFiles.map((video, index) => (
              <Button
                key={`video-link-${index}`}
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => window.open(video.url, '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View Video {index + 1}
              </Button>
            ))}
          </div>
        )}
        
        {/* Additional media (images only) */}
        {hasAdditionalMedia && additionalMedia.filter(media => media.type === 'image' && !media.url.toLowerCase().match(/\.(mp4|mov|avi|webm)$/)).map((media, index) => (
          <div key={`additional-media-${index}`} className="pt-4">
            {renderMediaItem(media, index)}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};

export default ProjectImageCarousel;
