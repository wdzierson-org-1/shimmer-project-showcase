
import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface MessageInputProps {
  message: string;
  setMessage: (message: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  onClearConversation?: () => void;
}

const MessageInput = ({ message, setMessage, handleSubmit, isLoading, onClearConversation }: MessageInputProps) => {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [showClearDialog, setShowClearDialog] = useState(false);

  // Focus input field when the component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleClearClick = () => {
    setShowClearDialog(true);
  };

  const handleConfirmClear = () => {
    if (onClearConversation) {
      onClearConversation();
    }
    setShowClearDialog(false);
  };

  return (
    <>
      <form 
        onSubmit={handleSubmit} 
        className="sticky bottom-0 py-6 px-4 border-t border-gray-300 flex flex-col gap-2 bg-background shadow-md"
      >
        <div className="relative flex-1">
          <Textarea
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask something..."
            className={cn(
              "resize-none min-h-[24px] max-h-32 text-lg bg-white w-full rounded-md",
              "focus-visible:ring-1 focus-visible:ring-primary focus-visible:outline-none p-3 shadow-sm font-light pr-12"
            )}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            disabled={isLoading}
            style={{ overflow: 'hidden' }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = '0px';
              target.style.height = target.scrollHeight + 'px';
            }}
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
            <ArrowRight size={20} />
          </div>
        </div>
        <div className="text-xs text-muted-foreground text-center px-1">
          <p>This is experimental AI. It may (and likely will) make mistakes.</p>
          {onClearConversation && (
            <button
              type="button"
              onClick={handleClearClick}
              className="text-muted-foreground hover:text-foreground underline mt-1"
            >
              Clear conversation history
            </button>
          )}
        </div>
      </form>

      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear chat conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your conversation history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmClear}>Yes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default MessageInput;
