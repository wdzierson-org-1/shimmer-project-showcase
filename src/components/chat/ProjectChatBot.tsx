import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageCircle, X, Send } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getChatCompletion } from '@/services/openai';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface ProjectChatBotProps {
  projectTitle: string;
  projectDescription?: string;
}

const ProjectChatBot: React.FC<ProjectChatBotProps> = ({ projectTitle, projectDescription }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: `Hello! I can help answer questions specifically about "${projectTitle}". What would you like to know about this project?`,
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || isLoading) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      content: message,
      sender: 'user',
      timestamp: new Date(),
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setMessage('');
    setIsLoading(true);
    
    try {
      // Create context about the current project
      const projectContext = `
        Project Title: ${projectTitle}
        ${projectDescription ? `Project Description: ${projectDescription}` : ''}
        
        You are answering questions specifically about this project. Focus your response on this project only.
        If the user asks about other projects or unrelated topics, politely redirect them back to this specific project.
      `;
      
      const aiResponse = await getChatCompletion({
        messages: [
          {
            role: 'system',
            content: projectContext
          },
          {
            role: 'user',
            content: message
          }
        ],
        model: 'gpt-4o-mini'
      });
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: aiResponse,
        sender: 'bot',
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "I'm sorry, I encountered an error while processing your question. Please try again.",
        sender: 'bot',
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  return (
    <>
      {/* Chat toggle button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 rounded-full w-12 h-12 p-0 shadow-lg z-50"
        aria-label="Toggle project chat"
      >
        {isOpen ? <X /> : <MessageCircle />}
      </Button>
      
      {/* Chat window - moved 40px to the left (20px more than before) */}
      <div
        className={`fixed bottom-0 right-10 w-full sm:w-96 bg-background border rounded-t-lg shadow-lg transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        } z-40`}
      >
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="font-medium text-sm">Chat about {projectTitle}</h3>
          <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
            <X size={18} />
          </Button>
        </div>
        
        <ScrollArea className="h-80 p-4">
          <div className="flex flex-col gap-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`max-w-[85%] ${
                  msg.sender === 'user'
                    ? 'ml-auto bg-primary text-primary-foreground'
                    : 'bg-muted'
                } rounded-lg p-3`}
              >
                {msg.sender === 'user' ? (
                  <p className="text-sm">{msg.content}</p>
                ) : (
                  <div className="text-sm prose prose-sm max-w-none prose-headings:text-sm prose-p:text-sm prose-p:leading-relaxed prose-pre:text-xs">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                )}
                <span className="text-xs opacity-70 mt-1 block">
                  {msg.timestamp.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))}
            {isLoading && (
              <div className="bg-muted rounded-lg p-3 max-w-[85%]">
                <p className="text-sm">Thinking...</p>
              </div>
            )}
          </div>
        </ScrollArea>
        
        <form onSubmit={handleSubmit} className="p-4 border-t flex gap-2">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask about ${projectTitle}...`}
            className="resize-none"
            rows={1}
            disabled={isLoading}
          />
          <Button type="submit" size="icon" disabled={isLoading || !message.trim()}>
            <Send size={18} />
          </Button>
        </form>
      </div>
    </>
  );
};

export default ProjectChatBot;
