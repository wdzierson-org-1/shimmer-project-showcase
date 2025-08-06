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
        // Morning: Golden sunrise - warm yellow to soft orange
        setGradientClass('bg-gradient-to-r from-yellow-300 via-orange-300 to-pink-300');
      } else if (hour >= 12 && hour < 17) {
        // Afternoon: Bright sky - vibrant blue to teal
        setGradientClass('bg-gradient-to-r from-blue-400 via-cyan-300 to-teal-400');
      } else if (hour >= 17 && hour < 20) {
        // Evening: Sunset - purple to light orange (like the original)
        setGradientClass('bg-gradient-to-r from-purple-500 via-pink-400 to-orange-300');
      } else {
        // Night: Deep twilight - dark blue to purple
        setGradientClass('bg-gradient-to-r from-blue-800 via-purple-700 to-indigo-800');
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