import { supabase, isSupabaseConfigured } from '@/lib/supabase';

interface LogEventParams {
  level?: 'info' | 'warn' | 'error';
  event: string;
  action?: string;
  component?: string;
  message?: string;
  error_name?: string;
  error_message?: string;
  stack?: string;
  status_code?: number;
  context?: Record<string, any>;
}

/**
 * Log an event to the backend logging system.
 * This function never throws errors to avoid breaking the user experience.
 */
export const logEvent = async (params: LogEventParams): Promise<void> => {
  try {
    if (!isSupabaseConfigured || !supabase) {
      console.warn('⚠️ Logging disabled: Supabase not configured');
      return;
    }

    const route = window.location.pathname;
    const sessionId = sessionStorage.getItem('session_id') || crypto.randomUUID();
    sessionStorage.setItem('session_id', sessionId);

    // Get auth token if available
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    // Build log payload
    const payload = {
      level: params.level || 'info',
      event: params.event,
      route,
      component: params.component,
      action: params.action,
      message: params.message,
      error_name: params.error_name,
      error_message: params.error_message,
      stack: params.stack,
      status_code: params.status_code,
      context: {
        ...params.context,
        session_id: sessionId,
        timestamp: new Date().toISOString(),
      },
    };

    // Get Supabase URL from client
    const supabaseUrl = 'https://yqzzcvkgeoghirfrflzq.supabase.co';
    const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxenpjdmtnZW9naGlyZnJmbHpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4NDQzNDUsImV4cCI6MjA3MzQyMDM0NX0.NiUzLQFPOwPMiTFKyxMS82hdrqWxE9JbLdIYo-zoJYo';

    // Send log to edge function (fire and forget with keepalive)
    fetch(`${supabaseUrl}/functions/v1/log-client-event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        'apikey': supabaseAnonKey,
      },
      body: JSON.stringify(payload),
      keepalive: true, // Ensure log is sent even if page is closed
    }).catch((error) => {
      // Swallow errors silently - logging should never break the app
      console.debug('Failed to send log (non-critical):', error.message);
    });

    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      const emoji = params.level === 'error' ? '🔴' : params.level === 'warn' ? '⚠️' : '📊';
      console.log(`${emoji} [${params.level?.toUpperCase()}] ${params.event}`, payload);
    }
  } catch (error) {
    // Swallow all errors - logging should never break the app
    console.debug('Logger error (non-critical):', error);
  }
};

/**
 * Log an error with full stack trace
 */
export const logError = async (
  error: Error,
  component?: string,
  action?: string,
  context?: Record<string, any>
): Promise<void> => {
  await logEvent({
    level: 'error',
    event: 'error',
    component,
    action,
    error_name: error.name,
    error_message: error.message,
    stack: error.stack,
    message: error.message,
    context,
  });
};

/**
 * Log a warning
 */
export const logWarning = async (
  message: string,
  component?: string,
  action?: string,
  context?: Record<string, any>
): Promise<void> => {
  await logEvent({
    level: 'warn',
    event: 'warning',
    component,
    action,
    message,
    context,
  });
};

/**
 * Log an info event
 */
export const logInfo = async (
  event: string,
  component?: string,
  action?: string,
  context?: Record<string, any>
): Promise<void> => {
  await logEvent({
    level: 'info',
    event,
    component,
    action,
    context,
  });
};
