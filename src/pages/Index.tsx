
import React from 'react';
import ChatInterface from '@/components/chat/ChatInterface';
import HomeHeader from '@/components/home/HomeHeader';
import HomeIntro from '@/components/home/HomeIntro';
import { useIsMobile } from '@/hooks/use-mobile';

const Index = () => {
  const isMobile = useIsMobile();
  
  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <HomeHeader />
      
      <div className="container mx-auto flex flex-col lg:flex-row flex-1 overflow-hidden">
        {/* Hide the left column on mobile */}
        {!isMobile && (
          <div className="flex-none lg:w-[320px] pt-24 pb-12 flex flex-col h-full">
            <HomeIntro />
          </div>
        )}
        
        {/* Adjust spacing based on whether left column is visible */}
        <div className={`${!isMobile ? 'lg:ml-16' : ''} flex-1 min-w-0 pt-24 pb-0`}>
          <ChatInterface />
        </div>
      </div>
    </div>
  );
};

export default Index;
