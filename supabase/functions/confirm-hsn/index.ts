import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ConfirmHSNRequest {
  product_description: string;
  actual_hsn: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { product_description, actual_hsn }: ConfirmHSNRequest = await req.json();
    if (!product_description || !actual_hsn) {
      return new Response(
        JSON.stringify({ error: "product_description and actual_hsn are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Try to find most recent suggestion for this description
    const { data: recent } = await supabaseClient
      .from('hsn_suggestions')
      .select('*')
      .eq('user_id', user.id)
      .ilike('product_description', `%${product_description}%`)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (recent) {
      const { error: updErr } = await supabaseClient
        .from('hsn_suggestions')
        .update({ is_confirmed: true, actual_hsn })
        .eq('id', recent.id);
      if (updErr) throw updErr;
    } else {
      const { error: insErr } = await supabaseClient
        .from('hsn_suggestions')
        .insert({
          user_id: user.id,
          product_description: product_description.trim(),
          suggested_hsn: actual_hsn,
          actual_hsn,
          is_confirmed: true,
          confidence_score: 1.0,
          ai_model: 'user-confirmed',
        });
      if (insErr) throw insErr;
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});


