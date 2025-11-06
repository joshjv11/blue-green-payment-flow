import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  taskType?: string;
}

export type TaskType = 'general' | 'invoice_summary' | 'follow_up' | 'billing_questions';

export const useAIAssistantEnhanced = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const sendMessage = async (
    message: string, 
    context?: string, 
    taskType: TaskType = 'general'
  ): Promise<void> => {
    if (!message.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date(),
      taskType
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant-enhanced', {
        body: {
          message,
          context,
          taskType
        }
      });

      if (error) {
        throw error;
      }

      if (!data?.response) {
        throw new Error('No response from AI assistant');
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        taskType: data.task_type
      };

      setMessages(prev => [...prev, assistantMessage]);

      toast({
        title: "AI Assistant",
        description: "Response generated successfully",
      });

    } catch (error: any) {
      console.error('Error in AI assistant:', error);
      
      toast({
        title: "AI Assistant Error",
        description: error.message || "Failed to get AI response. Please try again.",
        variant: "destructive",
      });

      // Add error message to chat
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm sorry, I encountered an error processing your request. Please try again or contact support if the issue persists.",
        timestamp: new Date(),
        taskType
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  const generateInvoiceSummary = async (bills: any[]): Promise<void> => {
    if (!bills?.length) {
      toast({
        title: "No Data",
        description: "No bills available to summarize",
        variant: "destructive",
      });
      return;
    }

    const context = JSON.stringify({
      bills: bills.map(bill => ({
        title: bill.title,
        amount: bill.amount,
        due_date: bill.due_date,
        status: bill.status,
        category: bill.category
      }))
    });

    await sendMessage(
      "Please provide a comprehensive summary of my current invoices, including total amounts, overdue bills, upcoming due dates, and any recommendations for improving cash flow.",
      context,
      'invoice_summary'
    );
  };

  const generateFollowUpMessage = async (bill: any): Promise<void> => {
    if (!bill) {
      toast({
        title: "No Bill Selected",
        description: "Please select a bill to generate a follow-up message",
        variant: "destructive",
      });
      return;
    }

    const context = JSON.stringify({
      bill: {
        title: bill.title,
        amount: bill.amount,
        due_date: bill.due_date,
        client_name: bill.client_name || 'Client',
        days_overdue: bill.due_date ? Math.ceil((new Date().getTime() - new Date(bill.due_date).getTime()) / (1000 * 3600 * 24)) : 0
      }
    });

    await sendMessage(
      "Please draft a professional follow-up message for this overdue invoice. Make it polite but firm, and include specific details about the invoice.",
      context,
      'follow_up'
    );
  };

  const askBillingQuestion = async (question: string): Promise<void> => {
    await sendMessage(question, undefined, 'billing_questions');
  };

  // Check if AI is available (has required API keys and config)
  const isAvailable = Boolean(supabase);

  return {
    messages,
    isLoading,
    sendMessage,
    clearChat,
    generateInvoiceSummary,
    generateFollowUpMessage,
    askBillingQuestion,
    isAvailable
  };
};