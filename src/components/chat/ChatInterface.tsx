
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

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-hidden">
        <MessageList 
          messages={messages} 
          isLoading={isLoading}
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
