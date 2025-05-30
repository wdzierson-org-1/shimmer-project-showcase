
import React, { useState } from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import ProjectDetail from '@/components/project/ProjectDetail';
import ContentDetail from '@/components/content/ContentDetail';

import { useChatMessages } from '@/hooks/useChatMessages';
import { useChatSuggestions } from '@/hooks/useChatSuggestions';
import { useDialogState } from '@/hooks/useDialogState';

const ChatInterface = () => {
  const [message, setMessage] = useState('');
  const { messages, isLoading, processMessage } = useChatMessages();
  const { suggestions, hideSuggestions } = useChatSuggestions(messages);
  const {
    selectedProject,
    selectedContent,
    projectDialogOpen,
    contentDialogOpen,
    handleProjectSelect,
    handleContentSelect,
    handleCloseProjectDetail,
    handleCloseContentDetail,
  } = useDialogState();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) return;
    
    hideSuggestions();
    await processMessage(message);
    setMessage('');
  };

  const handleSuggestionClick = async (suggestionText: string) => {
    hideSuggestions();
    await processMessage(suggestionText);
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-background">
      <div className="flex flex-col h-full">
        <div className="flex-grow overflow-hidden relative">
          <ScrollArea className="h-full pr-4">
            <MessageList 
              messages={messages} 
              isLoading={isLoading} 
              onProjectSelect={handleProjectSelect}
              onContentSelect={handleContentSelect}
              suggestions={suggestions}
              onSuggestionClick={handleSuggestionClick}
            />
          </ScrollArea>
        </div>
        <MessageInput 
          message={message}
          setMessage={setMessage}
          handleSubmit={handleSubmit}
          isLoading={isLoading}
        />
      </div>
      
      {/* Full-screen project detail dialog */}
      <Dialog open={projectDialogOpen} onOpenChange={handleCloseProjectDetail}>
        <DialogContent className="max-w-full w-full h-[90vh] p-0 rounded-lg">
          {selectedProject && (
            <ProjectDetail project={selectedProject} onClose={handleCloseProjectDetail} />
          )}
        </DialogContent>
      </Dialog>

      {/* Content detail dialog */}
      <Dialog open={contentDialogOpen} onOpenChange={handleCloseContentDetail}>
        <DialogContent className="max-w-full w-full h-[90vh] p-0 rounded-lg">
          {selectedContent && (
            <ContentDetail content={selectedContent} onClose={handleCloseContentDetail} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChatInterface;
