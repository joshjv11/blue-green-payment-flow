import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FileGSTR1Request {
  filing_period: string;
  gstin: string;
  auto_upload?: boolean; // If true, uploads directly to GSTN after generation
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

    const { filing_period, gstin, auto_upload = true }: FileGSTR1Request = await req.json();

    if (!filing_period || !gstin) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: filing_period, gstin" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get GSTN credentials
    const { data: credentials, error: credError } = await supabaseClient
      .from("gstn_credentials")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (credError || !credentials) {
      return new Response(
        JSON.stringify({ error: "GSTN credentials not found. Please set up your credentials first." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Decrypt password
    const { data: decryptedPassword, error: decryptError } = await supabaseClient.rpc(
      'decrypt_gstn_password',
      {
        encrypted_password: credentials.password_encrypted,
        user_id: user.id,
      }
    );

    if (decryptError || !decryptedPassword) {
      return new Response(
        JSON.stringify({ error: "Failed to decrypt GSTN password" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 1: Generate GSTR-1 JSON (reuse existing logic)
    const generateResponse = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/generate-gstr1`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ filing_period, filing_type: "monthly", gstin }),
      }
    );

    if (!generateResponse.ok) {
      const errorData = await generateResponse.json();
      return new Response(
        JSON.stringify({ error: "Failed to generate GSTR-1", details: errorData }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { gstr1_json } = await generateResponse.json();

    if (!auto_upload) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "GSTR-1 generated successfully",
          gstr1_json,
          uploaded: false,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Upload to GSTN portal
    const apiEndpoint = credentials.api_endpoint || 'https://einvoice.gst.gov.in';
    
    // Authenticate with GSTN
    const authResponse = await fetch(`${apiEndpoint}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: credentials.username,
        password: decryptedPassword,
      }),
    });

    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      return new Response(
        JSON.stringify({
          error: "GSTN authentication failed",
          details: errorText,
          gstr1_json, // Return generated JSON even if upload fails
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authData = await authResponse.json();
    const gstnToken = authData.token || authData.access_token;

    if (!gstnToken) {
      return new Response(
        JSON.stringify({
          error: "No authentication token received from GSTN",
          gstr1_json,
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Upload GSTR-1 to GSTN
    const uploadEndpoints = [
      `${apiEndpoint}/returns/gstr1/file`,
      `${apiEndpoint}/gstr1/file`,
      `${apiEndpoint}/api/returns/gstr1/file`,
    ];

    let uploadResponse = null;
    let uploadResult = null;

    for (const endpoint of uploadEndpoints) {
      try {
        uploadResponse = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${gstnToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            gstin,
            ret_period: filing_period,
            data: gstr1_json,
          }),
        });

        if (uploadResponse.ok) {
          uploadResult = await uploadResponse.json();
          console.log(`✅ GSTR-1 uploaded successfully to ${endpoint}`);
          break;
        } else {
          console.warn(`⚠️ Endpoint ${endpoint} returned ${uploadResponse.status}`);
        }
      } catch (err) {
        console.warn(`⚠️ Endpoint ${endpoint} failed:`, err);
        continue;
      }
    }

    if (!uploadResponse || !uploadResponse.ok) {
      return new Response(
        JSON.stringify({
          error: "Failed to upload GSTR-1 to GSTN portal",
          details: uploadResponse?.statusText || "Unknown error",
          gstr1_json, // Return generated JSON even if upload fails
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update filing status in database
    const ackNo = uploadResult?.ack_no || uploadResult?.arn || uploadResult?.acknowledgement_number;
    
    if (ackNo) {
      await supabaseClient
        .from("gstr_filing_status")
        .upsert({
          user_id: user.id,
          filing_type: "gstr1",
          filing_period: filing_period,
          status: "filed",
          acknowledgement_number: ackNo,
          filed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "user_id,filing_type,filing_period",
        });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "GSTR-1 filed successfully with GSTN",
        acknowledgement_number: ackNo,
        uploaded: true,
        gstr1_json,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error filing GSTR-1:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

