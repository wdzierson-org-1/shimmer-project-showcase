
import React, { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { ExternalLink, Play, FileText } from 'lucide-react';
import PdfViewer from '@/components/ui/pdf-viewer';
import ImageLightbox from './ImageLightbox';

interface MediaItem {
  url: string;
  type: 'image' | 'video' | 'pdf';
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
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [currentPdf, setCurrentPdf] = useState<{ url: string; title: string } | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentImage, setCurrentImage] = useState<{ url: string; alt: string } | null>(null);
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
      // Fallback for legacy URLs - check file extension
      const isVideo = mediaString.toLowerCase().match(/\.(mp4|mov|avi|webm)$/);
      const isPdf = mediaString.toLowerCase().match(/\.pdf$/);
      return {
        url: mediaString,
        type: isVideo ? 'video' : isPdf ? 'pdf' : 'image',
        thumbnailUrl: mediaString
      };
    }
  };

  // Parse main media item
  const mainMedia = mainImageUrl ? parseMediaItem(mainImageUrl) : null;
  
  // Parse additional media items
  const additionalMedia = additionalImages?.map(parseMediaItem).filter(media => media.url) || [];
  
  // Find all video and PDF files
  const allMedia = [mainMedia, ...additionalMedia].filter(Boolean) as MediaItem[];
  const videoFiles = allMedia.filter(media => media.type === 'video' || media.url.toLowerCase().match(/\.(mp4|mov|avi|webm)$/));
  const pdfFiles = allMedia.filter(media => media.type === 'pdf' || media.url.toLowerCase().match(/\.pdf$/));

  const handlePdfClick = (url: string, pdfTitle: string) => {
    setCurrentPdf({ url, title: pdfTitle });
    setPdfViewerOpen(true);
  };

  const handleImageClick = (url: string, alt: string) => {
    setCurrentImage({ url, alt });
    setLightboxOpen(true);
  };
  
  const hasAdditionalMedia = additionalMedia.length > 0;
  
  const renderMediaItem = (media: MediaItem, index?: number) => {
    const key = index !== undefined ? `additional-media-${index}` : 'main-media';
    
    console.log(`ProjectImageCarousel rendering ${key}:`, media);
    
    // For PDFs, show document icon and open in modal
    if (media.type === 'pdf' || media.url.toLowerCase().match(/\.pdf$/)) {
      return (
        <div 
          key={key} 
          className="relative cursor-pointer bg-gray-100 rounded-md border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors" 
          onClick={() => handlePdfClick(media.url, `${title} - Document ${index !== undefined ? index + 1 : ''}`)}
        >
          <div className="w-full h-64 flex items-center justify-center">
            <div className="text-center">
              <FileText size={48} className="mx-auto mb-2 text-gray-600" />
              <p className="text-gray-700 font-medium">PDF Document</p>
              <p className="text-xs text-gray-500 mt-1">Click to view</p>
            </div>
          </div>
          {/* PDF indicator */}
          <div className="absolute top-2 left-2 bg-red-600 text-white text-xs px-2 py-1 rounded">
            PDF
          </div>
        </div>
      );
    }
    
    // For videos, show thumbnail with play button overlay
    if (media.type === 'video' || media.url.toLowerCase().match(/\.(mp4|mov|avi|webm)$/)) {
      const displayUrl = media.thumbnailUrl || media.url;
      
      console.log(`Using thumbnail URL for video ${key}:`, displayUrl);
      console.log(`Video URL: ${media.url}`);
      console.log(`Thumbnail URL: ${media.thumbnailUrl}`);
      
      // If thumbnailUrl is empty or undefined, show a placeholder
      if (!media.thumbnailUrl || media.thumbnailUrl === media.url) {
        return (
          <div key={key} className="relative cursor-pointer bg-gray-200 rounded-md" onClick={() => window.open(media.url, '_blank')}>
            <div className="w-full h-64 flex items-center justify-center">
              <div className="text-center">
                <Play size={48} className="mx-auto mb-2 text-gray-400" />
                <p className="text-gray-500">Video thumbnail not available</p>
                <p className="text-xs text-gray-400 mt-1">Click to play video</p>
              </div>
            </div>
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
      
      return (
        <div key={key} className="relative cursor-pointer" onClick={() => window.open(media.url, '_blank')}>
          <img 
            src={displayUrl} 
            alt={index !== undefined ? `${title} - Video ${index + 1}` : `${title} - Video`} 
            className="w-full h-auto object-cover rounded-md"
            onError={(e) => {
              console.error('Failed to load video thumbnail:', displayUrl);
              console.error('Media object was:', media);
              console.error('Image error event:', e);
              // Replace with placeholder on error
              e.currentTarget.style.display = 'none';
              const placeholder = e.currentTarget.parentElement?.querySelector('.thumbnail-placeholder');
              if (placeholder) {
                (placeholder as HTMLElement).style.display = 'flex';
              }
            }}
            onLoad={() => {
              console.log('Successfully loaded video thumbnail:', displayUrl);
            }}
          />
          {/* Placeholder that shows if image fails to load */}
          <div className="thumbnail-placeholder w-full h-64 bg-gray-200 rounded-md items-center justify-center" style={{ display: 'none' }}>
            <div className="text-center">
              <Play size={48} className="mx-auto mb-2 text-gray-400" />
              <p className="text-gray-500">Video thumbnail failed to load</p>
              <p className="text-xs text-gray-400 mt-1 break-all px-2">URL: {displayUrl}</p>
            </div>
          </div>
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
    
    const altText = index !== undefined ? `${title} - ${index + 1}` : title;
    
    return (
      <img 
        key={key}
        src={displayUrl} 
        alt={altText} 
        className="w-full h-auto object-cover rounded-md cursor-pointer hover:opacity-90 transition-opacity"
        onClick={() => handleImageClick(media.url, altText)}
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
  
  // Check if there are any images to determine if we should show the scrollbar
  const hasImages = (mainMedia && mainMedia.url) || hasAdditionalMedia;
  
  return (
    <div className="h-[calc(100vh-12rem)]">
      <ScrollArea className={`h-full ${hasImages ? 'overflow-y-scroll' : ''}`}>
        <div className="space-y-4 pr-2">
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
      
      {/* PDF Viewer Modal */}
      {currentPdf && (
        <PdfViewer
          isOpen={pdfViewerOpen}
          onClose={() => {
            setPdfViewerOpen(false);
            setCurrentPdf(null);
          }}
          pdfUrl={currentPdf.url}
          title={currentPdf.title}
        />
      )}
      
      {/* Image Lightbox */}
      {currentImage && (
        <ImageLightbox
          isOpen={lightboxOpen}
          onClose={() => {
            setLightboxOpen(false);
            setCurrentImage(null);
          }}
          imageUrl={currentImage.url}
          alt={currentImage.alt}
        />
      )}
    </div>
  );
};

export default ProjectImageCarousel;
