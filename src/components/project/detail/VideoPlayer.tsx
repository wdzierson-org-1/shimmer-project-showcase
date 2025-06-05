
import React, { useState } from 'react';
import { Play } from 'lucide-react';

interface VideoPlayerProps {
  videoUrl: string;
  thumbnailUrl: string;
  title: string;
  className?: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ 
  videoUrl, 
  thumbnailUrl, 
  title, 
  className = "" 
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleVideoClick = () => {
    window.open(videoUrl, '_blank');
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    console.error('Failed to load video thumbnail:', thumbnailUrl);
    console.error('Image error event:', e);
    setImageError(true);
  };

  const handleImageLoad = () => {
    console.log('Successfully loaded video thumbnail:', thumbnailUrl);
    setImageError(false);
  };

  return (
    <div 
      className={`relative cursor-pointer ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleVideoClick}
    >
      {/* Video thumbnail */}
      {!imageError ? (
        <img 
          src={thumbnailUrl} 
          alt={`${title} - Video thumbnail`} 
          className="w-full h-auto object-cover rounded-md"
          onError={handleImageError}
          onLoad={handleImageLoad}
          crossOrigin="anonymous"
        />
      ) : (
        <div className="w-full h-64 bg-gray-200 rounded-md flex items-center justify-center">
          <div className="text-center">
            <Play size={48} className="mx-auto mb-2 text-gray-400" />
            <p className="text-gray-500">Video thumbnail unavailable</p>
            <p className="text-xs text-gray-400 mt-1">URL: {thumbnailUrl}</p>
          </div>
        </div>
      )}
      
      {/* Play button overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-black bg-opacity-50 rounded-full p-4 transition-transform hover:scale-110">
          <Play 
            size={32} 
            className="text-white fill-white" 
          />
        </div>
      </div>
      
      {/* Hover overlay */}
      {isHovered && (
        <div className="absolute inset-0 bg-black bg-opacity-80 rounded-md transition-opacity duration-200 flex items-center justify-center">
          <div className="text-white text-center">
            <Play size={48} className="mx-auto mb-2 fill-white" />
            <p className="text-sm">Click to play video</p>
          </div>
        </div>
      )}
      
      {/* Video type indicator */}
      <div className="absolute top-2 left-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
        Video
      </div>
    </div>
  );
};

export default VideoPlayer;
