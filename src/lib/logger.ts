import { getAccessToken } from '@/lib/apiClient';

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
    const route = window.location.pathname;
    const sessionId = sessionStorage.getItem('session_id') || crypto.randomUUID();
    sessionStorage.setItem('session_id', sessionId);

    const token = getAccessToken();

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
        has_token: !!token,
      },
    };

    if (process.env.NODE_ENV === 'development') {
      const emoji = params.level === 'error' ? '🔴' : params.level === 'warn' ? '⚠️' : '📊';
      console.log(`${emoji} [${params.level?.toUpperCase()}] ${params.event}`, payload);
    }
  } catch (error) {
    console.debug('Logger error (non-critical):', error);
  }
};

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
