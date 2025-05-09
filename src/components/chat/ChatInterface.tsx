
import React, { useState, useEffect } from 'react';
import { Project } from '@/components/project/ProjectCard';
import ProjectDetail from '@/components/project/ProjectDetail';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { Message } from '@/types/chat';
import { processUserMessage } from '@/services/chatService';
import { savePrompt } from '@/services/promptTrackingService';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import ContentDetail from '@/components/content/ContentDetail';
import { ContentEntry } from '@/services/content/contentService';

const ChatInterface = () => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      content: "Hi, I'm Will's portfolio assistant. Just ask to see recent work, work by industry, role, or whatever you'd like. You're also welcome to ask questions about my skills and interests.",
      sender: 'bot',
      timestamp: new Date(),
    }
  ]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedContent, setSelectedContent] = useState<ContentEntry | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [contentDialogOpen, setContentDialogOpen] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { toast } = useToast();
  
  // Array of suggestion buttons that will fade in - UPDATED with new suggestion
  const suggestions = [
    { text: "Show me recent work", delay: 0 },
    { text: "Briefly tell me about your work experience", delay: 300 },
    { text: "What's been on your mind lately?", delay: 600 }
  ];

  useEffect(() => {
    // Show suggestion buttons after 5 seconds if no messages have been sent
    const timer = setTimeout(() => {
      if (messages.length === 1) {
        setShowSuggestions(true);
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) return;
    
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content: message,
      sender: 'user',
      timestamp: new Date(),
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setMessage('');
    setIsLoading(true);
    setShowSuggestions(false); // Hide suggestions once user starts typing
    
    try {
      // Process the message to determine if we need to show projects
      const response = await processUserMessage(message);
      
      // Add bot response
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: response.content,
        sender: 'bot',
        timestamp: new Date(),
        projects: response.projects,
        showProjects: response.showProjects,
      };
      
      setMessages((prev) => [...prev, botResponse]);
      
      // Save the prompt and response to the database
      await savePrompt(message, response.content);
    } catch (error) {
      console.error('Error processing message:', error);
      
      toast({
        title: "Error",
        description: "Failed to process your message. Please try again.",
        variant: "destructive"
      });
      
      const errorResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: "I'm sorry, I encountered an error processing your request. Please try again.",
        sender: 'bot',
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, errorResponse]);
      
      // Still save the prompt with error info
      await savePrompt(message, "Error processing request");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestionText: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      content: suggestionText,
      sender: 'user',
      timestamp: new Date(),
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setShowSuggestions(false); // Hide suggestions once user starts interacting
    setIsLoading(true);
    
    processUserMessage(suggestionText)
      .then(response => {
        const botResponse: Message = {
          id: (Date.now() + 1).toString(),
          content: response.content,
          sender: 'bot',
          timestamp: new Date(),
          projects: response.projects,
          showProjects: response.showProjects,
          contentEntries: response.contentEntries,
          showContentEntries: response.showContentEntries,
        };
        
        setMessages((prev) => [...prev, botResponse]);
        
        // Save the prompt and response to the database
        savePrompt(suggestionText, response.content);
      })
      .catch(error => {
        console.error('Error processing suggestion:', error);
        
        toast({
          title: "Error",
          description: "Failed to process your message. Please try again.",
          variant: "destructive"
        });
        
        const errorResponse: Message = {
          id: (Date.now() + 1).toString(),
          content: "I'm sorry, I encountered an error processing your request. Please try again.",
          sender: 'bot',
          timestamp: new Date(),
        };
        
        setMessages((prev) => [...prev, errorResponse]);
        
        // Still save the prompt with error info
        savePrompt(suggestionText, "Error processing request");
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project);
    setProjectDialogOpen(true);
  };

  const handleContentSelect = (content: ContentEntry) => {
    setSelectedContent(content);
    setContentDialogOpen(true);
  };

  const handleCloseProjectDetail = () => {
    setSelectedProject(null);
    setProjectDialogOpen(false);
  };

  const handleCloseContentDetail = () => {
    setSelectedContent(null);
    setContentDialogOpen(false);
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
              suggestions={showSuggestions ? suggestions : []}
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
      <Dialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen}>
        <DialogContent className="max-w-full w-full h-[90vh] p-0 rounded-lg">
          {selectedProject && (
            <ProjectDetail project={selectedProject} onClose={handleCloseProjectDetail} />
          )}
        </DialogContent>
      </Dialog>

      {/* Content detail dialog */}
      <Dialog open={contentDialogOpen} onOpenChange={setContentDialogOpen}>
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
