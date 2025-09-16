import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Bill {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  due_date: string;
  category: string;
  status: 'unpaid' | 'paid' | 'overdue';
  notes: string | null;
}

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone_number: string | null;
  sms_notifications_enabled: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📱 Starting SMS notification process...');

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Initialize Twilio
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      console.error('❌ Twilio credentials not configured');
      throw new Error('Twilio credentials not configured');
    }

    console.log('🔑 Twilio credentials found, initializing client...');

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayStr = today.toISOString().split('T')[0];
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    console.log(`📅 Checking bills due today (${todayStr}) and tomorrow (${tomorrowStr})`);

    // Fetch bills due today or tomorrow that are unpaid
    const { data: bills, error: billsError } = await supabase
      .from('bills')
      .select(`
        id, user_id, name, amount, due_date, category, status, notes
      `)
      .in('status', ['unpaid', 'overdue'])
      .in('due_date', [todayStr, tomorrowStr]);

    if (billsError) {
      console.error('❌ Error fetching bills:', billsError);
      throw billsError;
    }

    if (!bills || bills.length === 0) {
      console.log('✅ No bills due today or tomorrow for SMS');
      return new Response(
        JSON.stringify({ message: 'No bills due for SMS notifications', count: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log(`📋 Found ${bills.length} bills requiring SMS notifications`);

    // Group bills by user
    const billsByUser = new Map<string, Bill[]>();
    bills.forEach((bill) => {
      if (!billsByUser.has(bill.user_id)) {
        billsByUser.set(bill.user_id, []);
      }
      billsByUser.get(bill.user_id)!.push(bill);
    });

    console.log(`👥 Processing SMS notifications for ${billsByUser.size} users`);

    // Fetch user profiles for all unique user IDs who have SMS enabled
    const userIds = Array.from(billsByUser.keys());
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, full_name, phone_number, sms_notifications_enabled')
      .in('id', userIds)
      .eq('sms_notifications_enabled', true);

    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError);
      throw profilesError;
    }

    let smsSent = 0;
    let smsFailed = 0;

    // Send SMS notifications to each user with SMS enabled
    for (const [userId, userBills] of billsByUser) {
      const profile = profiles?.find(p => p.id === userId);
      if (!profile || !profile.phone_number || !profile.sms_notifications_enabled) {
        console.log(`⚠️ SMS not enabled or no phone number for user ${userId}, skipping`);
        continue;
      }

      try {
        const billsDueToday = userBills.filter(b => b.due_date === todayStr);
        const billsDueTomorrow = userBills.filter(b => b.due_date === tomorrowStr);
        
        const totalAmount = userBills.reduce((sum, bill) => sum + bill.amount, 0);
        const displayName = profile.full_name || profile.email.split('@')[0];

        // Create SMS content
        let message = '';

        if (billsDueToday.length > 0 && billsDueTomorrow.length > 0) {
          message = `Hi ${displayName}! 💰 InvoiceFlow Alert: You have ${billsDueToday.length} bill(s) due TODAY and ${billsDueTomorrow.length} due tomorrow. Total: ₹${totalAmount.toLocaleString('en-IN')}. Don't forget to pay them!`;
        } else if (billsDueToday.length > 0) {
          message = `🚨 Hi ${displayName}! InvoiceFlow Alert: ${billsDueToday.length} bill(s) due TODAY! Total: ₹${totalAmount.toLocaleString('en-IN')}. Pay now to avoid late fees.`;
        } else {
          message = `⏰ Hi ${displayName}! InvoiceFlow Reminder: ${billsDueTomorrow.length} bill(s) due tomorrow. Total: ₹${totalAmount.toLocaleString('en-IN')}. Get ready to pay!`;
        }

        // Send SMS using Twilio API
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
        const twilioAuth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

        const response = await fetch(twilioUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${twilioAuth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            From: twilioPhoneNumber,
            To: profile.phone_number,
            Body: message,
          }),
        });

        if (!response.ok) {
          const errorData = await response.text();
          console.error(`❌ Failed to send SMS to ${profile.phone_number}:`, {
            status: response.status,
            error: errorData,
            recipientPhone: profile.phone_number,
            message: message
          });
          smsFailed++;
        } else {
          const responseData = await response.json();
          console.log(`✅ SMS sent successfully to ${profile.phone_number} - SID: ${responseData.sid}`);
          smsSent++;
        }

      } catch (error) {
        console.error(`❌ Error processing SMS for user ${userId}:`, {
          userId,
          userEmail: profile?.email || 'unknown',
          error: error.message,
          errorName: error.name,
          billsCount: userBills.length
        });
        smsFailed++;
      }
    }

    console.log(`📱 SMS summary: ${smsSent} sent, ${smsFailed} failed`);

    return new Response(
      JSON.stringify({
        message: 'SMS notifications processed',
        billsProcessed: bills.length,
        usersNotified: billsByUser.size,
        smsSent,
        smsFailed
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );

  } catch (error: any) {
    console.error('❌ SMS notification function error:', {
      error: error.message || error,
      errorName: error.name || 'UnknownError',
      stack: error.stack || 'No stack trace',
      timestamp: new Date().toISOString()
    });
    return new Response(
      JSON.stringify({
        error: error.message || 'Unknown error occurred',
        details: 'Failed to process SMS notifications',
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );
  }
};

serve(handler);