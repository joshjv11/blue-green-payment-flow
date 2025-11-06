import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// This function runs hourly via cron to sync GSTR-2B data for all active Premium users
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get current period
    const now = new Date();
    const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    // Get previous period (for reconciliation)
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousPeriod = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;

    console.log(`🔄 Starting hourly GSTR-2B sync for period ${currentPeriod}...`);

    // Get all Premium users with active GSTN credentials
    const { data: users, error: usersError } = await supabaseClient
      .from("gstn_credentials")
      .select(`
        user_id,
        gstin,
        username,
        password_encrypted,
        api_endpoint,
        profiles!inner (
          id,
          user_plans!inner (
            plan,
            is_active
          )
        )
      `)
      .eq("is_active", true);

    if (usersError) {
      console.error("❌ Error fetching users:", usersError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch users", details: usersError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!users || users.length === 0) {
      console.log("ℹ️ No users with active GSTN credentials found");
      return new Response(
        JSON.stringify({ message: "No users to sync", synced: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter to only Premium users
    const premiumUsers = users.filter((u: any) => 
      u.profiles?.user_plans?.plan === 'premium' && 
      u.profiles?.user_plans?.is_active === true
    );

    console.log(`📊 Found ${premiumUsers.length} Premium users to sync`);

    let successCount = 0;
    let errorCount = 0;
    const errors: any[] = [];

    // Sync GSTR-2B for each user
    for (const userCred of premiumUsers) {
      try {
        const userId = userCred.user_id;
        
        // Decrypt password
        const { data: decryptedPassword, error: decryptError } = await supabaseClient.rpc(
          'decrypt_gstn_password',
          {
            encrypted_password: userCred.password_encrypted,
            user_id: userId,
          }
        );

        if (decryptError || !decryptedPassword) {
          console.error(`❌ Failed to decrypt password for user ${userId}`);
          errorCount++;
          errors.push({ user_id: userId, error: "Password decryption failed" });
          continue;
        }

        // Download GSTR-2B for current period
        const form2bData = await downloadForm2A2B(
          {
            username: userCred.username,
            password: decryptedPassword,
            gstin: userCred.gstin,
            api_endpoint: userCred.api_endpoint || 'https://einvoice.gst.gov.in',
          },
          currentPeriod
        );

        // Store in cache table
        await supabaseClient
          .from("form2b_cache")
          .upsert({
            user_id: userId,
            period: currentPeriod,
            data: form2bData,
            synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, {
            onConflict: "user_id,period",
          });

        console.log(`✅ Synced GSTR-2B for user ${userId} (${form2bData.length} invoices)`);
        successCount++;

        // Trigger ITC reconciliation if there are mismatches
        if (form2bData.length > 0) {
          // Call reconcile-itc edge function to check for mismatches
          await fetch(
            `${Deno.env.get("SUPABASE_URL")}/functions/v1/reconcile-itc`,
            {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                period: currentPeriod,
                auto_download_form2a: false, // Already downloaded
              }),
            }
          ).catch(err => {
            console.warn(`⚠️ Reconciliation check failed for user ${userId}:`, err);
          });
        }

      } catch (error: any) {
        console.error(`❌ Error syncing user ${userCred.user_id}:`, error);
        errorCount++;
        errors.push({ user_id: userCred.user_id, error: error.message });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `GSTR-2B sync completed`,
        period: currentPeriod,
        total_users: premiumUsers.length,
        success_count: successCount,
        error_count: errorCount,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("❌ GSTR-2B sync error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Reuse downloadForm2A2B function from reconcile-itc
async function downloadForm2A2B(credentials: any, period?: string): Promise<any[]> {
  try {
    const apiBase = credentials.api_endpoint || 'https://einvoice.gst.gov.in';
    const retPeriod = period || getCurrentPeriod();

    // Authenticate with GSTN
    const authRes = await fetch(`${apiBase}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: credentials.username,
        password: credentials.password,
      }),
    });

    if (!authRes.ok) {
      throw new Error(`GSTN authentication failed: ${authRes.status}`);
    }

    const auth = await authRes.json();
    const token = auth.token || auth.access_token;
    if (!token) {
      throw new Error('No authentication token received from GSTN');
    }

    // Fetch GSTR-2B
    const endpoints = [
      `${apiBase}/returns/gstr2b?ret_period=${encodeURIComponent(retPeriod)}&gstin=${encodeURIComponent(credentials.gstin)}`,
      `${apiBase}/gstr2b?ret_period=${encodeURIComponent(retPeriod)}&gstin=${encodeURIComponent(credentials.gstin)}`,
      `${apiBase}/api/returns/gstr2b?ret_period=${encodeURIComponent(retPeriod)}&gstin=${encodeURIComponent(credentials.gstin)}`,
    ];

    let twoBRes = null;
    let twoB = null;

    for (const endpoint of endpoints) {
      try {
        twoBRes = await fetch(endpoint, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (twoBRes.ok) {
          twoB = await twoBRes.json();
          break;
        }
      } catch (err) {
        continue;
      }
    }

    if (!twoBRes || !twoBRes.ok) {
      throw new Error(`Failed to fetch GSTR-2B: ${twoBRes?.status || 'No response'}`);
    }

    // Parse GSTR-2B data
    let b2b = [];
    if (twoB.data?.docdata?.b2b) {
      b2b = twoB.data.docdata.b2b;
    } else if (twoB.b2b) {
      b2b = twoB.b2b;
    } else if (twoB.data?.b2b) {
      b2b = twoB.data.b2b;
    } else if (Array.isArray(twoB)) {
      b2b = twoB;
    } else {
      b2b = twoB.data || [];
    }

    if (!Array.isArray(b2b)) {
      b2b = [];
    }

    // Normalize invoice data
    const invoices: any[] = [];
    for (const party of b2b) {
      const supplierGstin = party.ctin || party.gstin || party.supplier_gstin;
      const invoicesList = party.inv || party.invoices || [];
      
      for (const inv of invoicesList) {
        const taxAmount = (inv.itms || inv.items || []).reduce((sum: number, item: any) => {
          const d = item.itm_det || item.item_details || item;
          return sum + 
            (Number(d.iamt) || 0) +
            (Number(d.camt) || 0) +
            (Number(d.samt) || 0);
        }, 0);

        invoices.push({
          invoice_number: inv.inum || inv.invoice_number || inv.inv_no,
          invoice_date: inv.idt || inv.invoice_date || inv.date,
          supplier_gstin: supplierGstin,
          tax_amount: taxAmount || Number(inv.tax_amount) || 0,
          invoice_value: Number(inv.val) || Number(inv.invoice_value) || 0,
          supplier_name: party.name || party.supplier_name,
          irn: inv.irn || inv.irn_no,
        });
      }
    }

    return invoices;
  } catch (error: any) {
    console.error('❌ Error downloading Form 2A/2B:', error);
    throw error;
  }
}

function getCurrentPeriod(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

