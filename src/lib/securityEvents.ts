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
    // Feature disabled - requires database table
    console.log('Security event (disabled):', eventType, severity, metadata);
  } catch (error) {
    console.error('Error in logSecurityEvent:', error);
  }
}

