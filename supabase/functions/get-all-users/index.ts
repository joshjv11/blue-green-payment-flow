import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use service role to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch all profiles
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (profilesError) {
      throw profilesError;
    }

    // Fetch all user plans
    const { data: plans, error: plansError } = await supabaseAdmin
      .from('user_plans')
      .select('*')
      .order('created_at', { ascending: false });

    if (plansError) {
      console.error('Plans error:', plansError);
    }

    // Fetch all payments (if table exists)
    let payments: any[] = [];
    const { data: paymentsData, error: paymentsError } = await supabaseAdmin
      .from('payment_transactions')
      .select('*')
      .order('created_at', { ascending: false });

    if (paymentsError) {
      // Table might not exist, that's okay
      if (paymentsError.code !== 'PGRST116' && paymentsError.message?.includes('does not exist')) {
        console.log('payment_transactions table does not exist, skipping');
      } else {
        console.error('Payments error:', paymentsError);
      }
    } else {
      payments = paymentsData || [];
    }

    return new Response(
      JSON.stringify({
        success: true,
        users: profiles || [],
        plans: plans || [],
        payments: payments || [],
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("get-all-users error", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal Server Error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

