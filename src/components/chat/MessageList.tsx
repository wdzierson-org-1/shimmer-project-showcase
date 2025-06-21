
import React, { useEffect, useRef } from 'react';
import MessageItem from './MessageItem';
import { Message } from '@/types/chat';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Sparkle, Lightbulb, MessageSquareQuote } from 'lucide-react';
import { ContentEntry } from '@/services/content/contentService';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SuggestionButton {
  text: string;
  delay: number;
}

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  onProjectSelect: (project: any) => void;
  onContentSelect?: (content: ContentEntry) => void;
  suggestions?: SuggestionButton[];
  onSuggestionClick?: (suggestion: string) => void;
}

const MessageList = ({
  messages,
  isLoading,
  onProjectSelect,
  onContentSelect,
  suggestions = [],
  onSuggestionClick
}: MessageListProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of messages when new ones come in
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, suggestions]);

  // Get an icon based on the suggestion index
  const getIconForSuggestion = (index: number) => {
    switch (index % 3) {
      case 0:
        return <Sparkle className="mr-2" size={18} />;
      case 1:
        return <Lightbulb className="mr-2" size={18} />;
      case 2:
        return <MessageSquareQuote className="mr-2" size={18} />;
      default:
        return <Sparkle className="mr-2" size={18} />;
    }
  };

  return (
    <ScrollArea className="h-full">
      <div className="py-6 px-4">
        <div className="flex flex-col space-y-6">
          {messages.map((message) => (
            <MessageItem
              key={message.id}
              message={message}
              onProjectSelect={onProjectSelect}
              onContentSelect={onContentSelect}
            />
          ))}
          
          {/* Suggestion buttons that fade in */}
          {suggestions.length > 0 && (
            <div className="flex flex-col items-start gap-3 mt-2">
              {suggestions.map((suggestion, index) => (
                <Button
                  key={index}
                  onClick={() => onSuggestionClick?.(suggestion.text)}
                  className={cn(
                    "text-[#333333] hover:bg-[#ff8a6a] rounded-full transition-opacity duration-500 opacity-0 w-auto flex items-center",
                    "animate-fade-in bg-[#FF977B]"
                  )}
                  style={{ 
                    animationDelay: `${suggestion.delay}ms`,
                    animationFillMode: 'forwards'
                  }}
                >
                  {getIconForSuggestion(index)}
                  {suggestion.text}
                </Button>
              ))}
            </div>
          )}
          
          {isLoading && (
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 bg-zinc-400 rounded-full animate-pulse"></div>
              <div className="h-2 w-2 bg-zinc-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <div className="h-2 w-2 bg-zinc-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
    </ScrollArea>
  );
};

export default MessageList;
