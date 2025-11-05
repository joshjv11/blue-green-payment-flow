import { supabase } from '@/lib/supabase';

/**
 * Log security events for abuse detection
 * This should be called from edge functions or server-side code
 * For client-side, use sparingly to avoid exposing security logic
 */
export async function logSecurityEvent(
  eventType: 'failed_login' | 'rate_limit_hit' | 'suspicious_api_call' | 'payment_fraud_attempt' | 'unauthorized_access' | 'abnormal_activity',
  severity: 'low' | 'medium' | 'high' | 'critical',
  metadata?: Record<string, any>,
  userId?: string,
  ipAddress?: string,
  userAgent?: string
) {
  try {
    // Get current user if not provided
    const { data: { user } } = await supabase.auth.getUser();
    const finalUserId = userId || user?.id;

    const { error } = await supabase
      .from('security_events')
      .insert({
        event_type: eventType,
        severity,
        user_id: finalUserId || null,
        ip_address: ipAddress || null,
        user_agent: userAgent || (typeof window !== 'undefined' ? window.navigator.userAgent : null),
        metadata: metadata || {},
      });

    if (error) {
      console.error('Error logging security event:', error);
    }
  } catch (error) {
    console.error('Error in logSecurityEvent:', error);
  }
}

