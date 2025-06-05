
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

  const handleVideoClick = () => {
    window.open(videoUrl, '_blank');
  };

  return (
    <div 
      className={`relative cursor-pointer ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleVideoClick}
    >
      {/* Video thumbnail */}
      <img 
        src={thumbnailUrl} 
        alt={`${title} - Video thumbnail`} 
        className="w-full h-auto object-cover rounded-md"
      />
      
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
    </div>
  );
};

export default VideoPlayer;
