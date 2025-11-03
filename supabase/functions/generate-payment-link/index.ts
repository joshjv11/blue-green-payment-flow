import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

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
      // Placeholder for Razorpay integration
      // In production, you would call Razorpay API here
      paymentLinkUrl = `https://razorpay.com/payment-link/pl_${Date.now()}`;
      console.log('✅ Razorpay payment link generated');
    } else if (gateway === 'phonepe') {
      // Placeholder for PhonePe integration
      paymentLinkUrl = `https://phonepe.com/pay/${Date.now()}`;
      console.log('✅ PhonePe payment link generated');
    } else if (gateway === 'paytm') {
      // Placeholder for Paytm integration
      paymentLinkUrl = `https://paytm.com/pay/${Date.now()}`;
      console.log('✅ Paytm payment link generated');
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
        notes
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
        expiresAt: expiresAt.toISOString()
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
