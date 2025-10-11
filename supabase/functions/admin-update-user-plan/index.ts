import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization')!;

    // Create client with user's auth for admin check
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify caller is admin
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: isAdmin } = await supabaseClient.rpc('is_system_admin', { user_id: user.id });
    if (!isAdmin) {
      console.log('Non-admin user attempted to update plan:', user.id);
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { user_id, new_plan } = await req.json();

    if (!user_id || !new_plan) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: user_id, new_plan' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['free', 'pro'].includes(new_plan.toLowerCase())) {
      return new Response(
        JSON.stringify({ error: 'Invalid plan. Must be "free" or "pro"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role client for data operations
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get current plan
    const { data: currentPlan, error: fetchError } = await serviceClient
      .from('user_plans')
      .select('plan')
      .eq('user_id', user_id)
      .single();

    if (fetchError) {
      console.error('Error fetching current plan:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch current plan' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const old_plan = currentPlan?.plan || 'free';
    const normalized_new_plan = new_plan.toLowerCase().trim();

    // Update user plan
    const { error: updateError } = await serviceClient
      .from('user_plans')
      .upsert({
        user_id,
        plan: normalized_new_plan,
        ai_queries_limit: normalized_new_plan === 'pro' ? 999999 : 3,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      });

    if (updateError) {
      console.error('Error updating user plan:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update plan' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log plan change
    const { error: logError } = await serviceClient
      .from('user_plan_changes')
      .insert({
        user_id,
        changed_by: user.id,
        old_plan,
        new_plan: normalized_new_plan,
      });

    if (logError) {
      console.error('Error logging plan change:', logError);
    }

    console.log('Plan updated successfully:', { user_id, old_plan, new_plan: normalized_new_plan, changed_by: user.id });

    return new Response(
      JSON.stringify({ 
        success: true, 
        user_id, 
        plan: normalized_new_plan,
        old_plan 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
