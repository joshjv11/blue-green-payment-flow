import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { checkRateLimit, getRateLimitIdentifier } from '../_shared/rateLimit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaymentLinkRequest {
  amount: number;
  currency?: string;
  gateway: 'razorpay' | 'phonepe' | 'paytm' | 'upi';
  customerId?: string;
  invoiceId?: string;
  saleOrderId?: string;
  billId?: string;
  notes?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('💳 Starting payment link generation...');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Rate limiting: 100 payment links per hour per user
    const identifier = getRateLimitIdentifier(user, req);
    const rateLimit = await checkRateLimit(identifier, {
      limit: 100,
      window: "1 h",
      prefix: "payment:link"
    });

    if (!rateLimit.success) {
      return new Response(JSON.stringify({
        error: 'Rate limit exceeded',
        message: `You've exceeded the limit of 100 payment links per hour. Please try again later.`,
        reset: rateLimit.reset
      }), {
        status: 429,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Retry-After': String(rateLimit.reset - Math.floor(Date.now() / 1000)),
          'X-RateLimit-Limit': String(rateLimit.limit),
          'X-RateLimit-Remaining': String(rateLimit.remaining),
          'X-RateLimit-Reset': String(rateLimit.reset)
        }
      });
    }

    const body: PaymentLinkRequest = await req.json();
    const { amount, currency = 'INR', gateway, customerId, invoiceId, saleOrderId, billId, notes } = body;

    // Get user's business settings for UPI ID
    const { data: businessSettings } = await supabase
      .from('business_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    let paymentLinkUrl = '';
    let qrCodeUrl = '';
    let upiId = '';
    let providerReferenceId = '';

    // Generate payment link based on gateway
    if (gateway === 'upi') {
      // Use the UPI ID from config or business settings
      const configUpiId = 'joshuavaz55@okicici'; // From payment config
      upiId = configUpiId;
      
      // Generate UPI payment string
      const upiString = `upi://pay?pa=${upiId}&pn=InvoiceFlow&am=${amount}&cu=${currency}&tn=${encodeURIComponent(notes || 'Payment')}`;
      paymentLinkUrl = upiString;
      
      // Generate QR code URL (using external service)
      qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiString)}`;
      
      console.log('✅ UPI payment link generated');
    } else if (gateway === 'razorpay') {
      // Fully integrate Razorpay Payment Links
      const keyId = Deno.env.get('RAZORPAY_KEY_ID');
      const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
      if (!keyId || !keySecret) {
        return new Response(JSON.stringify({ error: 'Razorpay keys not configured' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Build request payload
      const referenceId = body.saleOrderId || body.invoiceId || body.billId || `generic-${user.id}-${Date.now()}`;
      const payload = {
        amount: Math.round(amount * 100), // paise
        currency: currency || 'INR',
        description: notes || 'Payment',
        reference_id: referenceId,
        notify: { sms: true, email: true },
        reminder_enable: true,
        accept_partial: false,
      };

      const basicAuth = btoa(`${keyId}:${keySecret}`);
      const res = await fetch('https://api.razorpay.com/v1/payment_links', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basicAuth}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const rp = await res.json();
      if (!res.ok) {
        console.error('Razorpay error:', rp);
        return new Response(JSON.stringify({ error: rp?.error || rp }), {
          status: res.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      paymentLinkUrl = rp?.short_url || rp?.url || '';
      providerReferenceId = rp?.id || '';
      console.log('✅ Razorpay payment link generated:', providerReferenceId);
    } else if (gateway === 'phonepe') {
      // PhonePe integration not yet implemented
      return new Response(JSON.stringify({ 
        error: 'PhonePe integration not available',
        message: 'Please use Razorpay or UPI payment methods'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else if (gateway === 'paytm') {
      // Paytm integration not yet implemented
      return new Response(JSON.stringify({ 
        error: 'Paytm integration not available',
        message: 'Please use Razorpay or UPI payment methods'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Set expiration (24 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Create payment link record
    const { data: paymentLink, error: dbError } = await supabase
      .from('payment_links')
      .insert({
        user_id: user.id,
        customer_id: customerId,
        invoice_id: invoiceId,
        sale_order_id: saleOrderId,
        bill_id: billId,
        amount,
        currency,
        payment_gateway: gateway,
        payment_link_url: paymentLinkUrl,
        qr_code_url: qrCodeUrl,
        upi_id: upiId || null,
        status: 'active',
        expires_at: expiresAt.toISOString(),
        notes,
        payment_reference: providerReferenceId || null
      })
      .select()
      .single();

    if (dbError) {
      console.error('❌ Database error:', dbError);
      throw new Error('Failed to create payment link record');
    }

    console.log('✅ Payment link created:', paymentLink.id);

    return new Response(JSON.stringify({
      success: true,
      paymentLink: {
        id: paymentLink.id,
        url: paymentLinkUrl,
        qrCodeUrl: qrCodeUrl,
        upiId: upiId,
        amount,
        currency,
        gateway,
        expiresAt: expiresAt.toISOString(),
        providerReferenceId
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Payment link generation error:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Unknown error occurred',
      details: 'Failed to generate payment link'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};

serve(handler);
