
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageCircle, X, Send } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

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

  const handleSubmit = (e: React.FormEvent) => {
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
    
    // Simulate bot response focused on the current project
    setTimeout(() => {
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `I understand you're asking about "${projectTitle}". ${projectDescription ? `Based on the project description: "${projectDescription.substring(0, 100)}..."` : ''} This is a focused chat for this specific project. What particular aspect would you like to know more about?`,
        sender: 'bot',
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, botMessage]);
    }, 1000);
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
      
      {/* Chat window */}
      <div
        className={`fixed bottom-0 right-0 w-full sm:w-96 bg-background border rounded-t-lg shadow-lg transition-transform duration-300 ease-in-out ${
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
                <p className="text-sm">{msg.content}</p>
                <span className="text-xs opacity-70 mt-1 block">
                  {msg.timestamp.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))}
          </div>
        </ScrollArea>
        
        <form onSubmit={handleSubmit} className="p-4 border-t flex gap-2">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={`Ask about ${projectTitle}...`}
            className="resize-none"
            rows={1}
          />
          <Button type="submit" size="icon">
            <Send size={18} />
          </Button>
        </form>
      </div>
    </>
  );
};

export default ProjectChatBot;
