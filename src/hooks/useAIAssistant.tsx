import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const useAIAssistant = () => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (message: string, _bills: any[] = [], _context?: string) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    toast({
      title: 'Feature Temporarily Disabled',
      description: 'The AI Assistant will be back online soon with a more powerful model.',
      variant: 'destructive',
    });

    const replyMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: 'The AI Assistant is temporarily offline while we upgrade to a more powerful model. Please check back soon!',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, replyMessage]);
  };

  const clearChat = () => setMessages([]);

  return {
    messages,
    isLoading,
    sendMessage,
    clearChat,
    isAvailable: false,
  };
};
