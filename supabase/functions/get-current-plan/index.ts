import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authHeader = req.headers.get('Authorization')!;

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📊 Fetching plan for user:', user.email);

    // Get user plan from RLS-safe view
    const { data: planData, error: planError } = await supabase
      .from('user_plans')
      .select('plan, ai_queries_used, ai_queries_limit')
      .eq('user_id', user.id)
      .maybeSingle();

    if (planError) {
      console.error('❌ Plan fetch error:', planError);
      throw planError;
    }

    // Check if user is admin
    const { data: isAdminResult, error: adminError } = await supabase
      .rpc('is_system_admin', { user_id: user.id });

    const is_admin = !adminError && !!isAdminResult;

    // If no plan exists, create default
    if (!planData) {
      console.log('📊 Creating default plan for user');
      const { error: createError } = await supabase.rpc('create_default_user_plan', { _user_id: user.id });
      
      if (createError) {
        console.error('❌ Create plan error:', createError);
        throw createError;
      }

      return new Response(
        JSON.stringify({
          plan: 'free',
          is_admin,
          ai_queries_used: 0,
          ai_queries_limit: 3,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const plan = planData.plan === 'pro' || planData.plan === 'enterprise' ? 'pro' : 'free';

    console.log('✅ Plan fetched successfully:', plan);

    return new Response(
      JSON.stringify({
        plan,
        is_admin,
        ai_queries_used: planData.ai_queries_used || 0,
        ai_queries_limit: planData.ai_queries_limit || 3,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ get-current-plan error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
