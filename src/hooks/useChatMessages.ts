
import { useState } from 'react';
import { Message } from '@/types/chat';
import { processUserMessage } from '@/services/chatService';
import { savePrompt } from '@/services/promptTrackingService';
import { useToast } from '@/hooks/use-toast';

export const useChatMessages = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      content: "Hi, I'm Will's portfolio assistant. Just ask to see recent work, work by industry, role, or whatever you'd like. You're also welcome to ask questions about my skills and interests.",
      sender: 'bot',
      timestamp: new Date(),
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const addMessage = (message: Message) => {
    setMessages((prev) => [...prev, message]);
  };

  const processMessage = async (messageContent: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      content: messageContent,
      sender: 'user',
      timestamp: new Date(),
    };
    
    addMessage(userMessage);
    setIsLoading(true);
    
    try {
      const response = await processUserMessage(messageContent);
      
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
      
      addMessage(botResponse);
      await savePrompt(messageContent, response.content);
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
      
      addMessage(errorResponse);
      await savePrompt(messageContent, "Error processing request");
    } finally {
      setIsLoading(false);
    }
  };

  return {
    messages,
    isLoading,
    processMessage,
  };
};
