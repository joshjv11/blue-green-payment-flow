import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (
    req.method === 'GET' &&
    new URL(req.url).searchParams.get('health') === '1'
  ) {
    return new Response(
      JSON.stringify({ ok: true, ts: Date.now() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  try {
    const { message, context, taskType = 'general' } = await req.json();

    // Verify user authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Define system prompts based on task type
    const systemPrompts = {
      general: "You are an AI assistant for InvoiceFlow, a smart invoice management platform. Help users with invoice-related questions, provide insights, and suggest best practices.",
      invoice_summary: "You are an AI assistant specialized in analyzing and summarizing invoice data. Provide clear, concise summaries with key insights about payment patterns, overdue amounts, and actionable recommendations.",
      follow_up: "You are an AI assistant that helps draft professional follow-up messages for overdue invoices. Create polite but firm messages that encourage payment while maintaining good client relationships.",
      billing_questions: "You are an AI assistant that answers billing and payment-related questions. Provide accurate, helpful information about invoice management, payment processes, and best practices."
    };

    const systemPrompt = systemPrompts[taskType as keyof typeof systemPrompts] || systemPrompts.general;

    // Prepare the context for the AI
    let fullContext = systemPrompt;
    if (context) {
      fullContext += `\n\nContext: ${context}`;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: fullContext },
          { role: 'user', content: message }
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API Error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Log usage for the user (optional analytics)
    try {
      await supabase.from('ai_usage_log').insert({
        user_id: user.id,
        task_type: taskType,
        message_length: message.length,
        response_length: aiResponse.length,
        created_at: new Date().toISOString()
      });
    } catch (logError) {
      console.warn('Failed to log AI usage:', logError);
      // Don't fail the request if logging fails
    }

    return new Response(JSON.stringify({ 
      response: aiResponse,
      task_type: taskType 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-assistant-enhanced function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'An error occurred processing your request' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});