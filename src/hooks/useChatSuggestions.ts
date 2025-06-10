
import { useState, useEffect } from 'react';
import { Message } from '@/types/chat';

export const useChatSuggestions = (messages: Message[]) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const suggestions = [
    { text: "Show me recent work", delay: 0 },
    { text: "Briefly tell me about your work experience", delay: 300 },
    { text: "What's been on your mind lately?", delay: 600 }
  ];

  useEffect(() => {
    const timer = setTimeout(() => {
      if (messages.length === 1) {
        setShowSuggestions(true);
      }
    }, 4000); // Reduced from 5000ms to 4000ms

    return () => clearTimeout(timer);
  }, [messages]);

  const hideSuggestions = () => setShowSuggestions(false);

  return {
    suggestions: showSuggestions ? suggestions : [],
    showSuggestions,
    hideSuggestions,
  };
};
