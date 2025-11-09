import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bucket, path, userId, persist = true } = await req.json();

    if (!bucket || !path) {
      throw new Error('bucket and path are required');
    }

    console.log('📄 OCR extraction started:', { bucket, path, userId, persist });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Create signed URL for the image (60 second expiry)
    const { data: signedUrlData, error: signedUrlError } = await supabase
      .storage
      .from(bucket)
      .createSignedUrl(path, 60);

    if (signedUrlError || !signedUrlData) {
      console.error('❌ Failed to create signed URL:', signedUrlError);
      throw new Error(`Failed to access file: ${signedUrlError?.message}`);
    }

    console.log('🔗 Signed URL created successfully');

    // Call Lovable AI Gateway with vision model
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are an invoice OCR extraction assistant. Extract structured data from invoice images and return valid JSON with vendor, amount, due_date (ISO format), category, confidence (0-1), and currency fields.'
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract invoice data from this image. Return JSON with: vendor (string), amount (number), due_date (ISO date string), category (string: utilities/rent/subscription/other), confidence (0-1 float), currency (string, default INR).'
              },
              {
                type: 'image_url',
                image_url: {
                  url: signedUrlData.signedUrl
                }
              }
            ]
          }
        ],
        response_format: { type: 'json_object' }
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('❌ AI Gateway error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      if (aiResponse.status === 402) {
        throw new Error('AI credits exhausted. Please add credits to your workspace.');
      }
      throw new Error(`AI extraction failed: ${errorText}`);
    }

    const aiResult = await aiResponse.json();
    const content = aiResult.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content returned from AI');
    }

    const extraction = JSON.parse(content);
    console.log('✅ AI extraction complete:', extraction);

    // Validate extraction
    if (!extraction.vendor || !extraction.amount) {
      throw new Error('Incomplete extraction: vendor and amount are required');
    }

    let billId = null;

    // Optionally persist to database
    if (persist && userId) {
      const { data: billData, error: billError } = await supabase
        .from('bills')
        .insert({
          user_id: userId,
          name: extraction.vendor || 'Invoice',
          amount: extraction.amount,
          due_date: extraction.due_date || new Date().toISOString().split('T')[0],
          category: extraction.category || 'other',
          status: 'unpaid',
          notes: 'Created via OCR',
          ocr_source: 'lovable-gemini-2.5-flash',
          ocr_confidence: extraction.confidence || 0.8,
          invoice_image_url: `storage://${bucket}/${path}`
        })
        .select()
        .single();

      if (billError) {
        console.error('❌ Failed to save bill:', billError);
        throw new Error(`Failed to save bill: ${billError.message}`);
      }

      billId = billData.id;
      console.log('💾 Bill saved to database:', billId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        extraction: {
          vendor: extraction.vendor,
          amount: extraction.amount,
          due_date: extraction.due_date,
          category: extraction.category,
          confidence: extraction.confidence,
          currency: extraction.currency || 'INR'
        },
        bill: billId ? { id: billId } : null,
        imagePath: `storage://${bucket}/${path}`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('❌ OCR extraction error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
