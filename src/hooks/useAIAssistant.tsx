import { useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Bill {
  id: string;
  name: string;
  amount: number;
  due_date: string;
  category: string;
  status: 'paid' | 'unpaid' | 'overdue';
  notes?: string;
}

export const useAIAssistant = () => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (message: string, bills: Bill[] = [], context?: string) => {
    console.log('🤖 AI Assistant - Sending message:', { message, billsCount: bills.length, context });
    
    if (!isSupabaseConfigured || !supabase) {
      console.error('❌ Supabase not configured');
      toast({
        title: "Supabase Required",
        description: "Please connect to Supabase to use the AI assistant.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    // Add user message to chat
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('❌ User not authenticated');
        throw new Error('User not authenticated');
      }

      console.log('🤖 Calling AI assistant edge function...');

      // Call the Edge Function
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          message,
          bills,
          context
        }
      });

      if (error) {
        console.error('❌ Edge function error:', error);
        throw error;
      }

      console.log('🤖 AI response received:', { success: data?.success, hasResponse: !!data?.response });

      if (!data || !data.success) {
        throw new Error(data?.error || 'AI assistant request failed');
      }

      // Add AI response to chat
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);

      console.log('✅ AI message added to chat successfully');

    } catch (error) {
      console.error('❌ Error sending message to AI assistant:', error);
      
      let errorDescription = "Failed to get AI response. Please try again.";
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('not authenticated')) {
          errorDescription = "Please log in to use the AI assistant.";
        } else if (error.message.includes('API key')) {
          errorDescription = "AI service is temporarily unavailable. Please try again later.";
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorDescription = "Network error. Please check your connection and try again.";
        }
      }
      
      toast({
        title: "AI Assistant Error",
        description: errorDescription,
        variant: "destructive"
      });

      // Add helpful error message to chat
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm sorry, I'm having trouble responding right now. This could be due to:\n\n• Network connectivity issues\n• Service temporarily unavailable\n• Authentication problems\n\nPlease try again in a moment. If the issue persists, try refreshing the page.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  return {
    messages,
    isLoading,
    sendMessage,
    clearChat,
    isAvailable: isSupabaseConfigured
  };
};