import React, { useState, useEffect } from 'react';

interface TimeBasedGradientProps {
  children: React.ReactNode;
  className?: string;
}

const TimeBasedGradient: React.FC<TimeBasedGradientProps> = ({ children, className = "" }) => {
  const [gradientClass, setGradientClass] = useState('');

  useEffect(() => {
    const updateGradient = () => {
      const hour = new Date().getHours();
      
      if (hour >= 6 && hour < 12) {
        // Morning: Orange to Pink (sunrise vibes)
        setGradientClass('bg-gradient-to-r from-orange-500 via-amber-400 to-pink-400');
      } else if (hour >= 12 && hour < 17) {
        // Afternoon: Blue to Teal (bright daylight)
        setGradientClass('bg-gradient-to-r from-blue-500 via-cyan-400 to-teal-500');
      } else if (hour >= 17 && hour < 20) {
        // Evening: Orange to Purple (sunset)
        setGradientClass('bg-gradient-to-r from-orange-600 via-pink-500 to-purple-600');
      } else {
        // Night: Deep Blue to Purple (night sky)
        setGradientClass('bg-gradient-to-r from-slate-800 via-blue-900 to-purple-900');
      }
    };

    updateGradient();
    const interval = setInterval(updateGradient, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`${gradientClass} ${className}`}>
      {children}
    </div>
  );
};

export default TimeBasedGradient;