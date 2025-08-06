
import React from 'react';
import ChatInterface from '@/components/chat/ChatInterface';
import HomeHeader from '@/components/home/HomeHeader';
import HomeIntro from '@/components/home/HomeIntro';
import TimeBasedGradient from '@/components/ui/TimeBasedGradient';
import { useIsMobile } from '@/hooks/use-mobile';

const Index = () => {
  const isMobile = useIsMobile();
  
  return (
    <TimeBasedGradient className={`${isMobile ? 'min-h-screen' : 'h-screen'} flex flex-col ${isMobile ? '' : 'overflow-hidden'}`}>
      <HomeHeader />
      
      <div className={`container mx-auto flex flex-col lg:flex-row flex-1 ${isMobile ? '' : 'overflow-hidden'}`}>
        {/* Hide the left column on mobile */}
        {!isMobile && (
          <div className="flex-none lg:w-[320px] pt-24 pb-12 flex flex-col h-full">
            <div className="bg-black/10 backdrop-blur-sm rounded-lg p-6">
              <HomeIntro />
            </div>
          </div>
        )}
        
        {/* Adjust spacing based on whether left column is visible */}
        <div className={`${!isMobile ? 'lg:ml-16' : ''} flex-1 min-w-0 ${isMobile ? 'pt-20 pb-4' : 'pt-24 pb-0'}`}>
          <ChatInterface />
        </div>
      </div>
    </TimeBasedGradient>
  );
};

export default Index;
