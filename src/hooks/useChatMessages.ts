import { useState, useEffect } from 'react';
import { Message } from '@/types/chat';
import { processUserMessage } from '@/services/chatService';
import { savePrompt } from '@/services/promptTrackingService';
import { useToast } from '@/hooks/use-toast';
import { SecureStorage } from '@/utils/secureStorage';

const CHAT_STORAGE_KEY = 'chat_conversation_history';

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

  // Load conversation history from secure storage on mount
  useEffect(() => {
    const savedMessages = SecureStorage.getItem<Message[]>(CHAT_STORAGE_KEY);
    if (savedMessages && Array.isArray(savedMessages)) {
      try {
        // Convert timestamp strings back to Date objects and preserve all message properties
        const messagesWithDates = savedMessages.map((msg: any) => ({
          id: msg.id,
          content: msg.content,
          sender: msg.sender,
          timestamp: new Date(msg.timestamp),
          // Preserve bot message properties
          projects: msg.projects || undefined,
          showProjects: msg.showProjects || undefined,
          contentEntries: msg.contentEntries || undefined,
          showContentEntries: msg.showContentEntries || undefined,
          suggestions: msg.suggestions || undefined,
        }));
        setMessages(messagesWithDates);
      } catch (error) {
        console.error('Failed to parse saved messages:', error);
        // If parsing fails, keep default messages
      }
    }
  }, []);

  // Save messages to secure storage whenever messages change
  useEffect(() => {
    if (messages.length > 1) { // Only save if there are messages beyond the default
      // Store chat messages with 2 hour TTL
      SecureStorage.setItem(CHAT_STORAGE_KEY, messages, 2 * 60 * 60 * 1000);
    }
  }, [messages]);

  const addMessage = (message: Message) => {
    setMessages((prev) => [...prev, message]);
  };

  const clearConversation = () => {
    const defaultMessage = {
      id: '0',
      content: "Hi, I'm Will's portfolio assistant. Just ask to see recent work, work by industry, role, or whatever you'd like. You're also welcome to ask questions about my skills and interests.",
      sender: 'bot' as const,
      timestamp: new Date(),
    };
    setMessages([defaultMessage]);
    SecureStorage.removeItem(CHAT_STORAGE_KEY);
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
    clearConversation,
  };
};
