# GST Edge Functions - Complete Code for Manual Deployment

Copy-paste these codes into Supabase Dashboard → Edge Functions → Create New Function

---

## **Function 1: reconcile-itc**

**Function Name:** `reconcile-itc`

**Copy this entire code:**

```typescript
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ITCReconciliationRequest {
  period?: string; // Optional: "YYYY-MM" to reconcile specific period
  auto_download_form2a?: boolean; // Auto-download Form 2A/2B from GSTN
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
        JSON.stringify({ error: "ITC reconciliation is available only for Premium plan users" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { period, auto_download_form2a = false }: ITCReconciliationRequest = await req.json() || {};

    // Fetch purchase orders (inward supplies)
    let query = supabaseClient
      .from("purchase_orders")
      .select("*")
      .eq("user_id", user.id)
      .order("transaction_date", { ascending: false });

    if (period) {
      const [year, month] = period.split("-");
      const startDate = `${year}-${month}-01`;
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      const endDate = `${year}-${month}-${String(lastDay.getDate()).padStart(2, '0')}`;
      query = query.gte("transaction_date", startDate).lte("transaction_date", endDate);
    }

    const { data: purchases, error: purchaseError } = await query;

    if (purchaseError) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch purchase orders", details: purchaseError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!purchases || purchases.length === 0) {
      return new Response(
        JSON.stringify({ error: "No purchase orders found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get GSTN credentials for Form 2A/2B download
    let form2aData: any = null;
    if (auto_download_form2a) {
      const { data: credentials } = await supabaseClient
        .from("gstn_credentials")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single();

      if (credentials) {
        // Decrypt password before calling GSTN
        const { data: decrypted } = await supabaseClient.rpc('decrypt_gstn_password', {
          encrypted_password: credentials.password_encrypted,
          user_id: user.id,
        });
        const decCreds = { ...credentials, password: decrypted as string };
        // Download Form 2A/2B from GSTN
        form2aData = await downloadForm2A2B(decCreds, period);
      }
    }

    // Reconcile ITC for each purchase
    const reconciliationResults = [];
    const mismatches = [];

    for (const purchase of purchases) {
      // Calculate ITC eligible
      const itcEligible = (parseFloat(purchase.tax_amount) || 0);
      const itcClaimed = 0; // Will be updated from GSTR-3B filings

      // Check Form 2A/2B if available
      let form2aMatch = null;
      let mismatchReason = null;
      let reconciliationStatus = "pending";

      if (form2aData) {
        form2aMatch = form2aData.find((item: any) =>
          item.invoice_number === purchase.invoice_number &&
          item.invoice_date === purchase.transaction_date
        );

        if (form2aMatch) {
          const form2aTax = parseFloat(form2aMatch.tax_amount) || 0;
          const purchaseTax = parseFloat(purchase.tax_amount) || 0;

          if (Math.abs(form2aTax - purchaseTax) < 0.01) {
            reconciliationStatus = "matched";
          } else {
            reconciliationStatus = "mismatch";
            mismatchReason = `Tax amount mismatch: Your data shows ₹${purchaseTax}, GSTN shows ₹${form2aTax}`;
            mismatches.push({
              purchase_id: purchase.id,
              invoice_number: purchase.invoice_number,
              mismatch_reason: mismatchReason,
            });
          }
        } else {
          reconciliationStatus = "missing";
          mismatchReason = "Invoice not found in Form 2A/2B";
          mismatches.push({
            purchase_id: purchase.id,
            invoice_number: purchase.invoice_number,
            mismatch_reason: mismatchReason,
          });
        }
      }

      // Upsert ITC reconciliation record
      const { data: itcRecord, error: itcError } = await supabaseClient
        .from("itc_reconciliation")
        .upsert({
          user_id: user.id,
          purchase_order_id: purchase.id,
          gstin: purchase.supplier_gstin || "",
          invoice_number: purchase.invoice_number,
          invoice_date: purchase.transaction_date,
          invoice_value: parseFloat(purchase.grand_total) || 0,
          tax_amount: parseFloat(purchase.tax_amount) || 0,
          itc_eligible: itcEligible,
          itc_claimed: itcClaimed,
          form2a_2b_data: form2aMatch || null,
          form2a_2b_tax_amount: form2aMatch ? parseFloat(form2aMatch.tax_amount) : null,
          form2a_2b_status: form2aMatch ? reconciliationStatus : null,
          mismatch_reason: mismatchReason,
          reconciliation_status: reconciliationStatus,
          reconciled_at: new Date().toISOString(),
          reconciled_by: "auto",
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "user_id,invoice_number,invoice_date",
        })
        .select()
        .single();

      if (!itcError && itcRecord) {
        reconciliationResults.push(itcRecord);
      }
    }

    // Create mismatch alerts
    for (const mismatch of mismatches) {
      await supabaseClient
        .from("gst_mismatch_alerts")
        .insert({
          user_id: user.id,
          alert_type: "itc_mismatch",
          severity: "high",
          title: "ITC Mismatch Detected",
          description: mismatch.mismatch_reason,
          related_invoice_id: mismatch.purchase_id,
          mismatch_details: mismatch,
          is_resolved: false,
          created_at: new Date().toISOString(),
        });
    }

    return new Response(
      JSON.stringify({
        success: true,
        reconciled_count: reconciliationResults.length,
        matched_count: reconciliationResults.filter(r => r.reconciliation_status === "matched").length,
        mismatch_count: mismatches.length,
        mismatches,
        message: "ITC reconciliation completed",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("ITC reconciliation error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Download Form 2A/2B from GSTN
async function downloadForm2A2B(credentials: any, period?: string): Promise<any[]> {
  try {
    const apiBase = credentials.api_endpoint || 'https://einvoice.gst.gov.in';
    const retPeriod = period || getCurrentPeriod();

    // 1) Authenticate
    const authRes = await fetch(`${apiBase}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: credentials.username,
        password: credentials.password,
      }),
    });

    if (!authRes.ok) {
      console.error('GSTN auth failed when downloading 2A/2B');
      return [];
    }

    const auth = await authRes.json();
    const token = auth.token;
    if (!token) return [];

    // 2) Fetch 2B (preferred for ITC)
    const twoBRes = await fetch(
      `${apiBase}/returns/gstr2b?ret_period=${encodeURIComponent(retPeriod)}&gstin=${encodeURIComponent(credentials.gstin)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!twoBRes.ok) {
      console.error('GSTR-2B fetch failed');
      return [];
    }

    const twoB = await twoBRes.json();
    const b2b = twoB?.data?.docdata?.b2b || [];

    // Normalize
    const invoices: any[] = [];
    for (const party of b2b) {
      const supplierGstin = party.ctin;
      for (const inv of party.inv || []) {
        const taxAmount = (inv.itms || []).reduce((sum: number, item: any) => {
          const d = item.itm_det || {};
          return sum + (Number(d.iamt) || 0) + (Number(d.camt) || 0) + (Number(d.samt) || 0);
        }, 0);
        invoices.push({
          invoice_number: inv.inum,
          invoice_date: inv.idt,
          supplier_gstin: supplierGstin,
          tax_amount: taxAmount,
          invoice_value: Number(inv.val) || 0,
        });
      }
    }

    return invoices;
  } catch (error) {
    console.error('Error downloading Form 2A/2B:', error);
    return [];
  }
}

function getCurrentPeriod(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}
```

---

## **Function 2: suggest-hsn**

**Function Name:** `suggest-hsn`

**Copy this entire code:**

```typescript
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

  // Fallback: Simple keyword-based matching
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
```

---

## **Function 3: auto-sync-einvoice-status**

**Function Name:** `auto-sync-einvoice-status`

**Copy this entire code:**

```typescript
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
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Sync invoices with IRN in last 30 days where status not approved or stale
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);

    const sixHoursAgo = new Date();
    sixHoursAgo.setHours(sixHoursAgo.getHours() - 6);

    const { data: invoicesToSync, error: fetchError } = await supabaseClient
      .from("sales_orders")
      .select("id, user_id, irn, einvoice_status, einvoice_synced_at, billing_snapshot")
      .not("irn", "is", null)
      .gte("irn_generated_at", cutoff.toISOString())
      .or(`einvoice_synced_at.is.null,einvoice_synced_at.lt.${sixHoursAgo.toISOString()}`)
      .limit(200);

    if (fetchError) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch invoices", details: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!invoicesToSync || invoicesToSync.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No invoices need syncing", synced: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userGroups = new Map<string, typeof invoicesToSync>();
    for (const invoice of invoicesToSync) {
      if (!userGroups.has(invoice.user_id)) userGroups.set(invoice.user_id, []);
      userGroups.get(invoice.user_id)!.push(invoice);
    }

    let syncedCount = 0;
    let failedCount = 0;

    for (const [userId, invoices] of userGroups) {
      const { data: credentials } = await supabaseClient
        .from("gstn_credentials")
        .select("username, password_encrypted, gstin, api_endpoint")
        .eq("user_id", userId)
        .eq("is_active", true)
        .single();

      if (!credentials) continue;

      const { data: decrypted } = await supabaseClient.rpc('decrypt_gstn_password', {
        encrypted_password: credentials.password_encrypted,
        user_id: userId,
      });
      if (!decrypted) continue;

      const token = await authenticateGSTN(credentials.username, decrypted as string, credentials.api_endpoint || 'https://einvoice.gst.gov.in');
      if (!token) continue;

      for (const invoice of invoices) {
        try {
          const status = await syncInvoiceStatus(invoice.irn!, token, credentials.api_endpoint || 'https://einvoice.gst.gov.in');
          if (status.success) {
            await supabaseClient
              .from("sales_orders")
              .update({
                einvoice_status: status.status,
                einvoice_synced_at: new Date().toISOString(),
                gstn_response_data: status.data,
              })
              .eq("id", invoice.id);
            syncedCount++;
          } else {
            failedCount++;
          }
        } catch (_) {
          failedCount++;
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, synced: syncedCount, failed: failedCount, total: invoicesToSync.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function authenticateGSTN(username: string, password: string, apiEndpoint: string): Promise<string | null> {
  try {
    const authResponse = await fetch(`${apiEndpoint}/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!authResponse.ok) return null;
    const authData = await authResponse.json();
    return authData.token || null;
  } catch (e) {
    return null;
  }
}

async function syncInvoiceStatus(irn: string, token: string, apiEndpoint: string): Promise<any> {
  try {
    const res = await fetch(`${apiEndpoint}/einvoice/status/${irn}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (res.ok) {
      return { success: true, status: data.Status || 'generated', data };
    }
    return { success: false, error: data?.ErrorMessage || 'Failed' };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
```

---

## **Deployment Steps:**

1. **Go to Supabase Dashboard** → Your Project → Edge Functions

2. **For each function:**
   - Click "Create a new function"
   - Enter the function name (e.g., `reconcile-itc`)
   - Paste the corresponding code above
   - Click "Deploy"

3. **After deployment:**
   - Test buttons in `/gst` dashboard should work
   - No more "Failed to send" errors

---

## **Optional: Set Environment Variables**

If you want HSN suggestions to use Groq AI (optional):
- Go to Edge Functions → Settings → Secrets
- Add: `GROQ_API_KEY` = your Groq API key

---

**That's it! All 3 functions are ready to copy-paste.** 🚀

