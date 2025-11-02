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

// Helper function to call Groq API (FREE, fast, no credit card required)
async function callGroqAPI(
  message: string,
  bills: Bill[] = [],
  context?: string
): Promise<string> {
  const billsContext = bills?.map((bill) => ({
    name: bill.name,
    amount: bill.amount,
    dueDate: bill.due_date,
    category: bill.category,
    status: bill.status,
    notes: bill.notes
  })) || [];

  const systemPrompt = `You are InvoiceFlow's AI assistant, helping users manage their bills and payments effectively. 

Context about the user's bills:
${JSON.stringify(billsContext, null, 2)}

Guidelines:
- Be helpful, friendly, and concise
- Provide actionable advice for bill management
- When generating email templates, make them professional but friendly
- Always reference specific bill data when relevant
- Suggest practical payment strategies
- Help with financial organization and planning
- For summaries, be clear and highlight important insights

Current context: ${context || 'General bill management assistance'}`;

  // Groq free tier - Get a free API key at https://console.groq.com (no credit card required)
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('Groq API key not configured. Get a FREE API key at https://console.groq.com and add VITE_GROQ_API_KEY to your .env file');
  }

  try {
    // Check if we're in browser and API key is available
    console.log('🔑 Groq API Key check:', { hasKey: !!apiKey, keyLength: apiKey?.length, env: import.meta.env.MODE });
    
    // Use proxy in production/development to avoid CORS issues
    // In production, we'll fall back to Supabase edge function if proxy isn't available
    const isDev = import.meta.env.DEV;
    const apiUrl = isDev 
      ? '/api/groq/openai/v1/chat/completions' // Use Vite proxy in dev
      : 'https://api.groq.com/openai/v1/chat/completions'; // Direct call (will fail CORS, then fallback)
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    // Only add Authorization header if using proxy (dev) or if direct call works
    // In production, direct browser calls will fail CORS, so we skip auth and let it fallback
    if (isDev || window.location.hostname === 'localhost') {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant', // Free, fast model
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Groq API error:', { status: response.status, error: errorText });
      
      // Handle CORS errors
      if (response.status === 0 || errorText.includes('CORS') || errorText.includes('Failed to fetch')) {
        throw new Error('CORS error: Groq API cannot be called directly from browser. Environment variable may not be loaded in production.');
      }
      
      throw new Error(`Groq API error: ${response.status} - ${errorText.substring(0, 200)}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;
    
    if (!aiResponse) {
      throw new Error('No response content from Groq API');
    }
    
    return aiResponse;
  } catch (error) {
    console.error('❌ Groq API call failed:', error);
    
    // If it's a CORS or fetch error, provide helpful message
    if (error instanceof TypeError || (error as Error).message.includes('fetch') || (error as Error).message.includes('CORS')) {
      console.warn('⚠️ Direct browser call failed (likely CORS), will try Supabase edge function');
      throw new Error('GROQ_CORS_ERROR'); // Special error code to trigger fallback
    }
    
    throw error;
  }
}

// Helper function to call Google Gemini API (FREE tier available)
async function callGeminiAPI(
  message: string,
  bills: Bill[] = [],
  context?: string
): Promise<string> {
  const billsContext = bills?.map((bill) => ({
    name: bill.name,
    amount: bill.amount,
    dueDate: bill.due_date,
    category: bill.category,
    status: bill.status,
    notes: bill.notes
  })) || [];

  const systemPrompt = `You are InvoiceFlow's AI assistant, helping users manage their bills and payments effectively. 

Context about the user's bills:
${JSON.stringify(billsContext, null, 2)}

Guidelines:
- Be helpful, friendly, and concise
- Provide actionable advice for bill management
- When generating email templates, make them professional but friendly
- Always reference specific bill data when relevant
- Suggest practical payment strategies
- Help with financial organization and planning
- For summaries, be clear and highlight important insights

Current context: ${context || 'General bill management assistance'}`;

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key not configured. Get a free key at https://aistudio.google.com/app/apikey');
  }

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${systemPrompt}\n\nUser: ${message}\n\nAssistant:`
          }]
        }],
        generationConfig: {
          maxOutputTokens: 1000,
          temperature: 0.7,
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from AI';
  } catch (error) {
    console.warn('Gemini API failed:', error);
    throw error;
  }
}

// Helper function to call OpenAI API directly (fallback)
async function callOpenAIDirectly(
  message: string,
  bills: Bill[] = [],
  context?: string,
  apiKey?: string
): Promise<string> {
  // Prepare context for AI
  const billsContext = bills?.map((bill) => ({
    name: bill.name,
    amount: bill.amount,
    dueDate: bill.due_date,
    category: bill.category,
    status: bill.status,
    notes: bill.notes
  })) || [];

  const systemPrompt = `You are InvoiceFlow's AI assistant, helping users manage their bills and payments effectively. 

Context about the user's bills:
${JSON.stringify(billsContext, null, 2)}

Guidelines:
- Be helpful, friendly, and concise
- Provide actionable advice for bill management
- When generating email templates, make them professional but friendly
- Always reference specific bill data when relevant
- Suggest practical payment strategies
- Help with financial organization and planning
- For summaries, be clear and highlight important insights

Current context: ${context || 'General bill management assistance'}`;

  // Use Vite proxy to avoid CORS issues
  const proxyUrl = '/api/openai/v1/chat/completions';
  
  const response = await fetch(proxyUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      max_tokens: 1000,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    let errorText = '';
    try {
      errorText = await response.text();
      console.error('❌ OpenAI API error:', { 
        status: response.status, 
        statusText: response.statusText,
        error: errorText,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      // Try to parse as JSON for better error message
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error) {
          const errorType = errorJson.error.type || 'unknown';
          const errorMessage = errorJson.error.message || 'Unknown error';
          
          // Handle specific error types with user-friendly messages
          if (errorType === 'insufficient_quota' || errorMessage.includes('quota') || errorMessage.includes('billing')) {
            throw new Error(`Your OpenAI account has exceeded its quota or billing needs to be set up. Please check your OpenAI account billing and add credits at https://platform.openai.com/account/billing`);
          } else if (errorType === 'invalid_api_key' || errorMessage.includes('Invalid API key')) {
            throw new Error(`Invalid API key. Please check your OpenAI API key configuration.`);
          } else if (errorType === 'rate_limit_exceeded') {
            throw new Error(`Rate limit exceeded. Please try again in a moment.`);
          } else {
            throw new Error(`OpenAI API error: ${errorMessage}`);
          }
        }
      } catch (e) {
        // If it's already an Error with our message, rethrow it
        if (e instanceof Error && e.message.includes('OpenAI account')) {
          throw e;
        }
        // Not JSON or not our error, continue with generic error
      }
    } catch (e) {
      // If it's our custom error, rethrow it
      if (e instanceof Error && (e.message.includes('OpenAI account') || e.message.includes('Invalid API key') || e.message.includes('Rate limit'))) {
        throw e;
      }
      console.error('❌ Failed to read error response:', e);
    }
    throw new Error(`OpenAI API error: ${response.status} ${response.statusText}. ${errorText ? `Details: ${errorText.substring(0, 200)}` : ''}`);
  }

  const data = await response.json();
  console.log('✅ OpenAI response received:', { 
    hasChoices: !!data.choices?.length,
    model: data.model,
    usage: data.usage
  });
  
  const aiResponse = data.choices?.[0]?.message?.content;

  if (!aiResponse) {
    console.error('❌ No response content from OpenAI:', data);
    throw new Error('No response from AI - please try again');
  }

  return aiResponse;
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

      // Try free AI APIs first, then paid options
      console.log('🤖 Trying free AI services first...');
      
      // 1. Try Groq (FREE, fast, recommended)
      try {
        console.log('🆓 Attempting Groq API (free tier)...');
        console.log('🔍 Environment check:', { 
          hasGroqKey: !!import.meta.env.VITE_GROQ_API_KEY,
          groqKeyLength: import.meta.env.VITE_GROQ_API_KEY?.length || 0,
          envMode: import.meta.env.MODE,
          envDev: import.meta.env.DEV,
          envProd: import.meta.env.PROD
        });
        
        const aiResponse = await callGroqAPI(message, bills, context);
        const aiMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: aiResponse,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiMessage]);
        console.log('✅ AI message added via Groq');
        return;
      } catch (groqError) {
        const errorMsg = groqError instanceof Error ? groqError.message : String(groqError);
        console.warn('⚠️ Groq failed:', errorMsg);
        
        // If it's a CORS error or missing key, skip and try alternatives
        if (errorMsg.includes('GROQ_CORS_ERROR') || errorMsg.includes('not configured')) {
          console.warn('⚠️ Groq not available (CORS or missing key), trying alternatives...');
        }
      }
      
      // 2. Try Google Gemini (FREE tier)
      try {
        console.log('🆓 Attempting Gemini API (free tier)...');
        const aiResponse = await callGeminiAPI(message, bills, context);
        const aiMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: aiResponse,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiMessage]);
        console.log('✅ AI message added via Gemini');
        return;
      } catch (geminiError) {
        console.warn('⚠️ Gemini failed:', geminiError);
      }
      
      // 3. Try OpenAI if API key is available (via proxy)
      const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;
      if (openaiApiKey) {
        console.log('💳 Attempting OpenAI API (paid)...');
        try {
          const aiResponse = await callOpenAIDirectly(message, bills, context);
          const aiMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: aiResponse,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, aiMessage]);
          console.log('✅ AI message added via OpenAI');
          return;
        } catch (openaiError) {
          console.warn('⚠️ OpenAI failed, trying edge function:', openaiError);
        }
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
        
        // If we have a local API key, use it as fallback for ANY error
        if (openaiApiKey) {
          console.log('🔄 Edge function failed, trying fallback with local API key');
          try {
            const aiResponse = await callOpenAIDirectly(message, bills, context, openaiApiKey);
            const aiMessage: ChatMessage = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: aiResponse,
              timestamp: new Date()
            };
            setMessages(prev => [...prev, aiMessage]);
            console.log('✅ AI message added via fallback');
            return;
          } catch (fallbackError) {
            console.error('❌ Fallback also failed:', fallbackError);
            throw new Error(`Edge function failed and fallback also failed: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`);
          }
        }
        
        // Extract error message from different error formats
        const errorMsg = typeof error === 'string' 
          ? error 
          : error?.message || error?.error || JSON.stringify(error);
        throw new Error(errorMsg);
      }

      console.log('🤖 AI response received:', { success: data?.success, hasResponse: !!data?.response });

      if (!data || !data.success) {
        const errorMessage = data?.error || 'AI assistant request failed';
        
        // If we have a local API key, use it as fallback for ANY failure
        if (openaiApiKey) {
          console.log('🔄 Edge function returned error, trying fallback with local API key');
          try {
            const aiResponse = await callOpenAIDirectly(message, bills, context, openaiApiKey);
            const aiMessage: ChatMessage = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: aiResponse,
              timestamp: new Date()
            };
            setMessages(prev => [...prev, aiMessage]);
            console.log('✅ AI message added via fallback');
            return;
          } catch (fallbackError) {
            console.error('❌ Fallback also failed:', fallbackError);
            throw new Error(`Edge function failed (${errorMessage}) and fallback also failed: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`);
          }
        }
        
        throw new Error(errorMessage);
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
      let chatErrorMessage = "I'm sorry, I'm having trouble responding right now. This could be due to:\n\n• Network connectivity issues\n• Service temporarily unavailable\n• Authentication problems\n\nPlease try again in a moment. If the issue persists, try refreshing the page.";
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('not authenticated')) {
          errorDescription = "Please log in to use the AI assistant.";
          chatErrorMessage = "Please log in to use the AI assistant.";
        } else if (error.message.includes('API key') || error.message.includes('not configured')) {
          errorDescription = "OpenAI API key is not configured. Please set OPENAI_API_KEY in your Supabase project secrets or add VITE_OPENAI_API_KEY to your .env file for local development.";
          chatErrorMessage = "I'm unable to respond because the OpenAI API key is not configured.\n\nFor development:\n1. Create a .env file in your project root\n2. Add: VITE_OPENAI_API_KEY=your-api-key-here\n3. Restart your dev server\n\nFor production:\nSet OPENAI_API_KEY as a secret in your Supabase project settings.";
        } else if (error.message.includes('quota') || error.message.includes('billing')) {
          errorDescription = "Your OpenAI account has exceeded its quota. Please add credits to your OpenAI account.";
          chatErrorMessage = "I'm unable to respond because your OpenAI account has exceeded its quota or billing needs to be configured.\n\nPlease:\n1. Visit https://platform.openai.com/account/billing\n2. Add payment method or credits to your account\n3. Ensure you have available credits\n4. Try again after updating your billing";
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorDescription = "Network error. Please check your connection and try again.";
          chatErrorMessage = "Network connection error. Please check your internet connection and try again.";
        } else if (error.message.includes('OpenAI API error')) {
          errorDescription = "OpenAI API error. Please check your API key and try again.";
          chatErrorMessage = "There was an error communicating with the AI service. Please check your API key configuration and try again.";
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
        content: chatErrorMessage,
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