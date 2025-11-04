import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface HSNRequest {
  product_description: string;
  category?: string;
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

    // Check Premium plan
    const { data: userPlan } = await supabaseClient
      .from("user_plans")
      .select("plan, is_active, expires_at")
      .eq("user_id", user.id)
      .single();

    if (!userPlan || userPlan.plan !== 'premium' || !userPlan.is_active) {
      return new Response(
        JSON.stringify({ error: "HSN suggestion is available only for Premium plan users" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { product_description, category }: HSNRequest = await req.json();

    if (!product_description || product_description.trim() === "") {
      return new Response(
        JSON.stringify({ error: "Product description is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if we have a cached suggestion
    const { data: cached } = await supabaseClient
      .from("hsn_suggestions")
      .select("*")
      .eq("user_id", user.id)
      .ilike("product_description", `%${product_description}%`)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (cached && cached.is_confirmed) {
      return new Response(
        JSON.stringify({
          success: true,
          suggested_hsn: cached.actual_hsn || cached.suggested_hsn,
          confidence_score: cached.confidence_score,
          from_cache: true,
          source: "user_confirmed",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use AI to suggest HSN code
    const aiSuggestion = await suggestHSNWithAI(product_description, category);

    // Save suggestion
    const { data: suggestion, error: saveError } = await supabaseClient
      .from("hsn_suggestions")
      .insert({
        user_id: user.id,
        product_description: product_description.trim(),
        suggested_hsn: aiSuggestion.hsn,
        confidence_score: aiSuggestion.confidence,
        ai_model: aiSuggestion.model,
      })
      .select()
      .single();

    if (saveError) {
      console.error("Error saving HSN suggestion:", saveError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        suggested_hsn: aiSuggestion.hsn,
        confidence_score: aiSuggestion.confidence,
        description: aiSuggestion.description,
        from_cache: false,
        source: aiSuggestion.model,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("HSN suggestion error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// AI-powered HSN code suggestion
async function suggestHSNWithAI(description: string, category?: string): Promise<{
  hsn: string;
  confidence: number;
  description: string;
  model: string;
}> {
  // Try Groq first (free and fast)
  const groqApiKey = Deno.env.get("GROQ_API_KEY");
  if (groqApiKey) {
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${groqApiKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.1-70b-versatile",
          messages: [
            {
              role: "system",
              content: `You are an expert in Indian GST HSN (Harmonized System of Nomenclature) codes. 
              Given a product description, suggest the most appropriate 4-digit, 6-digit, or 8-digit HSN code.
              Respond ONLY with a JSON object in this exact format:
              {"hsn": "XXXX", "confidence": 0.0-1.0, "description": "Brief explanation"}
              HSN codes are used for GST in India. Use standard HSN codes from the GST tariff schedule.`,
            },
            {
              role: "user",
              content: `Product: ${description}${category ? `\nCategory: ${category}` : ""}\n\nSuggest HSN code.`,
            },
          ],
          temperature: 0.3,
          max_tokens: 200,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          return {
            hsn: parsed.hsn || "0000",
            confidence: parsed.confidence || 0.7,
            description: parsed.description || "AI suggested HSN code",
            model: "groq-llama",
          };
        }
      }
    } catch (error) {
      console.error("Groq API error:", error);
    }
  }

  // Fallback: Simple keyword-based matching (basic implementation)
  const hsnMapping: Record<string, string> = {
    "software": "998314",
    "service": "998314",
    "consulting": "998314",
    "food": "1901",
    "medicine": "3004",
    "textile": "5001",
    "electronics": "8517",
    "furniture": "9403",
    "mobile": "8517",
    "laptop": "8471",
  };

  const lowerDesc = description.toLowerCase();
  for (const [keyword, hsn] of Object.entries(hsnMapping)) {
    if (lowerDesc.includes(keyword)) {
      return {
        hsn,
        confidence: 0.6,
        description: `Matched based on keyword: ${keyword}`,
        model: "keyword-matching",
      };
    }
  }

  // Default fallback
  return {
    hsn: "998314", // General services
    confidence: 0.3,
    description: "Default HSN code for services. Please verify and update.",
    model: "fallback",
  };
}

