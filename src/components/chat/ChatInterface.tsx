
import React, { useState } from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { useChatMessages } from '@/hooks/useChatMessages';
import { useChatSuggestions } from '@/hooks/useChatSuggestions';

const ChatInterface = () => {
  const [message, setMessage] = useState('');
  const { messages, isLoading, processMessage, clearConversation } = useChatMessages();
  const { suggestions, hideSuggestions } = useChatSuggestions(messages);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;
    
    hideSuggestions();
    const messageToProcess = message.trim();
    setMessage('');
    await processMessage(messageToProcess);
  };

  const handleSuggestionClick = (suggestionText: string) => {
    setMessage(suggestionText);
    hideSuggestions();
    processMessage(suggestionText);
  };

  const handleProjectSelect = (project: any) => {
    // Navigate to project detail page
    window.location.href = `/project/${project.id}`;
  };

  const handleContentSelect = (content: any) => {
    // Navigate to content detail page
    window.location.href = `/content/${content.id}`;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-hidden">
        <MessageList 
          messages={messages} 
          isLoading={isLoading}
          onProjectSelect={handleProjectSelect}
          onContentSelect={handleContentSelect}
          suggestions={suggestions}
          onSuggestionClick={handleSuggestionClick}
        />
      </div>
      <MessageInput
        message={message}
        setMessage={setMessage}
        handleSubmit={handleSubmit}
        isLoading={isLoading}
        onClearConversation={clearConversation}
      />
    </div>
  );
};

export default ChatInterface;
