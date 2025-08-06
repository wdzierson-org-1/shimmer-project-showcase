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
        // Morning: Light orange to off-white
        setGradientClass('bg-gradient-to-r from-orange-200/50 to-orange-50/50');
      } else if (hour >= 12 && hour < 17) {
        // Afternoon: Light blue to off-white
        setGradientClass('bg-gradient-to-r from-blue-200/50 to-blue-50/50');
      } else if (hour >= 17 && hour < 20) {
        // Evening: Light orange to warm off-white
        setGradientClass('bg-gradient-to-r from-orange-300/50 to-amber-50/50');
      } else {
        // Night: Light purple to off-white
        setGradientClass('bg-gradient-to-r from-purple-200/50 to-slate-50/50');
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