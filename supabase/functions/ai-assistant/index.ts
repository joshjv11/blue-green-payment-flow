import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, getRateLimitIdentifier } from '../_shared/rateLimit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Health check endpoint
  if (req.method === 'GET') {
    return new Response(JSON.stringify({ 
      status: 'healthy',
      service: 'ai-assistant',
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const { message, bills, context } = await req.json();
    
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get user from JWT
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Rate limiting: 100 AI queries per hour per user
    const identifier = getRateLimitIdentifier(user, req);
    const rateLimit = await checkRateLimit(identifier, {
      limit: 100,
      window: "1 h",
      prefix: "ai:assistant"
    });

    if (!rateLimit.success) {
      return new Response(JSON.stringify({
        error: 'Rate limit exceeded',
        message: `You've exceeded the limit of 100 AI queries per hour. Please try again later.`,
        reset: rateLimit.reset
      }), {
        status: 429,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Retry-After': String(rateLimit.reset - Math.floor(Date.now() / 1000)),
          'X-RateLimit-Limit': String(rateLimit.limit),
          'X-RateLimit-Remaining': String(rateLimit.remaining),
          'X-RateLimit-Reset': String(rateLimit.reset)
        }
      });
    }

    // Get API keys from secrets - try Groq first (free), then OpenAI
    // NOTE: Edge functions don't have access to VITE_ prefixed env vars - those are frontend only
    // In Supabase secrets, set GROQ_API_KEY (without VITE_ prefix)
    const groqApiKey = Deno.env.get('GROQ_API_KEY');
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    
    // Log API key availability (without exposing keys)
    console.log('🔑 API Key Check:', {
      hasGroqKey: !!groqApiKey,
      groqKeyLength: groqApiKey?.length || 0,
      hasOpenAIKey: !!openaiApiKey,
      openAIKeyLength: openaiApiKey?.length || 0
    });

    // Prepare context for AI
    const billsContext = bills?.map((bill: any) => ({
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

    let aiResponse: string | null = null;

           // Try Groq first (free, fast)
           if (groqApiKey) {
             try {
               console.log('🆓 Attempting Groq API (free tier)...');
               const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                 method: 'POST',
                 headers: {
                   'Authorization': `Bearer ${groqApiKey}`,
                   'Content-Type': 'application/json',
                 },
                 body: JSON.stringify({
                   model: 'llama-3.1-8b-instant',
                   messages: [
                     { role: 'system', content: systemPrompt },
                     { role: 'user', content: message }
                   ],
                   max_tokens: 1000,
                   temperature: 0.7,
                 }),
               });

               if (groqResponse.ok) {
                 const groqData = await groqResponse.json();
                 aiResponse = groqData.choices?.[0]?.message?.content;
                 if (aiResponse) {
                   console.log('✅ Groq response received successfully');
                 } else {
                   console.warn('⚠️ Groq returned OK but no response content', groqData);
                 }
               } else {
                 const errorText = await groqResponse.text();
                 console.error('⚠️ Groq API error:', {
                   status: groqResponse.status,
                   statusText: groqResponse.statusText,
                   error: errorText.substring(0, 200)
                 });
                 console.warn('⚠️ Groq API error, trying OpenAI fallback');
               }
             } catch (groqError) {
               console.error('⚠️ Groq API failed with exception:', {
                 error: groqError instanceof Error ? groqError.message : String(groqError),
                 errorType: groqError instanceof Error ? groqError.name : typeof groqError
               });
               console.warn('⚠️ Groq API failed, trying OpenAI');
             }
           } else {
             console.warn('⚠️ Groq API key not found, skipping Groq');
           }

    // Fallback to OpenAI if Groq failed or not configured
    if (!aiResponse && openaiApiKey) {
      try {
        console.log('🤖 Calling OpenAI API with model: gpt-4o-mini');
        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
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

        if (!openaiResponse.ok) {
          const errorText = await openaiResponse.text();
          console.error('❌ OpenAI API error:', { status: openaiResponse.status, error: errorText });
          throw new Error(`OpenAI API error: ${openaiResponse.status} - ${openaiResponse.statusText}`);
        }

        const aiData = await openaiResponse.json();
        console.log('✅ OpenAI response received:', { hasChoices: !!aiData.choices?.length });
        aiResponse = aiData.choices?.[0]?.message?.content;
      } catch (openaiError) {
        console.error('❌ OpenAI API also failed:', openaiError);
        throw new Error('Both Groq and OpenAI APIs failed');
      }
    }

    if (!aiResponse) {
      throw new Error('No API keys configured. Please set GROQ_API_KEY or OPENAI_API_KEY in Supabase secrets');
    }

    console.log('✅ AI response prepared successfully');

    return new Response(
      JSON.stringify({ 
        response: aiResponse,
        success: true 
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('❌ Error in AI assistant function:', error);
    
    // Provide user-friendly error messages
    let userMessage = 'I apologize, but I encountered an issue processing your request.';
    let statusCode = 500;
    
    if (error.message?.includes('authentication') || error.message?.includes('unauthorized')) {
      userMessage = 'Please log in to use the AI assistant.';
      statusCode = 401;
    } else if (error.message?.includes('OpenAI API')) {
      userMessage = 'The AI service is temporarily unavailable. Please try again in a moment.';
      statusCode = 503;
    } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
      userMessage = 'Network connection issue. Please check your internet and try again.';
      statusCode = 502;
    }
    
    return new Response(
      JSON.stringify({ 
        error: userMessage,
        success: false,
        debug: error.message // Keep for debugging
      }),
      { 
        status: statusCode,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});