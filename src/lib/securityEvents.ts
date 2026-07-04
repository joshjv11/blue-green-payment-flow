/**
 * Log security events for abuse detection.
 * Admin security logging is not migrated yet — events are logged locally only.
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
    console.log('Security event (local only):', eventType, severity, { metadata, userId, ipAddress, userAgent });
  } catch (error) {
    console.error('Error in logSecurityEvent:', error);
  }
}
