import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LogEvent {
  level?: 'info' | 'warn' | 'error';
  event: string;
  route?: string;
  component?: string;
  action?: string;
  message?: string;
  error_name?: string;
  error_message?: string;
  stack?: string;
  status_code?: number;
  context?: Record<string, any>;
}

serve(async (req) => {
  // Handle CORS preflight
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

  const request_id = crypto.randomUUID();
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Extract user ID from Authorization header if present
    let user_id: string | null = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);
        user_id = user?.id || null;
      } catch (authError) {
        console.error('Failed to extract user from token:', authError);
      }
    }

    // Parse request body
    const body: LogEvent = await req.json();
    
    // Validate required fields
    if (!body.event) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required field: event',
          request_id 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Extract client info from headers
    const user_agent = req.headers.get('User-Agent') || null;
    const forwarded_for = req.headers.get('X-Forwarded-For');
    const ip = forwarded_for ? forwarded_for.split(',')[0].trim() : null;

    // Insert log with service role (bypasses RLS)
    const { error: insertError } = await supabase
      .from('app_logs')
      .insert({
        user_id,
        session_id: body.context?.session_id || null,
        level: body.level || 'info',
        event: body.event,
        route: body.route || null,
        component: body.component || null,
        action: body.action || null,
        message: body.message || null,
        error_name: body.error_name || null,
        error_message: body.error_message || null,
        stack: body.stack || null,
        status_code: body.status_code || null,
        user_agent,
        ip,
        request_id,
        context: body.context || {},
      });

    if (insertError) {
      console.error('Failed to insert log:', insertError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to insert log',
          request_id 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`✅ Log inserted: ${body.event} (${body.level}) - request_id: ${request_id}`);

    return new Response(
      JSON.stringify({ success: true, request_id }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error in log-client-event:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error',
        request_id 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
