/**
 * Centralized fetch wrapper with timeout and tab visibility abort
 * Prevents infinite buffering when tabs are hidden or requests hang
 */

// Capture native fetch BEFORE any modifications to prevent recursion
const NATIVE_FETCH =
  typeof window !== 'undefined' && window.fetch
    ? window.fetch.bind(window)
    : (globalThis.fetch as typeof window.fetch);

const FETCH_TIMEOUT_MS = 15000; // 15 seconds
const activeRequests = new Set<AbortController>();

// Abort all requests when tab becomes hidden
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      console.log('🔄 Tab hidden, aborting active requests...');
      activeRequests.forEach(controller => {
        controller.abort('Tab hidden');
      });
      activeRequests.clear();
    }
  });
}

/**
 * Enhanced fetch with automatic timeout and abort on tab hide
 */
export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort('Request timeout after 15s');
  }, FETCH_TIMEOUT_MS);

  // Merge abort signals if one was already provided
  const signal = init?.signal 
    ? combineAbortSignals(controller.signal, init.signal)
    : controller.signal;

  activeRequests.add(controller);

  try {
    const response = await NATIVE_FETCH(input, {
      ...init,
      signal,
    });

    clearTimeout(timeoutId);
    activeRequests.delete(controller);
    
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    activeRequests.delete(controller);

    // Enhance error message for better debugging
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.warn('⚠️ Request aborted:', input);
      } else if (error.message.includes('timeout')) {
        console.error('⏱️ Request timeout:', input);
      }
    }
    
    throw error;
  }
}

/**
 * Combine multiple abort signals into one
 */
function combineAbortSignals(...signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort();
      break;
    }
    signal.addEventListener('abort', () => controller.abort(), { once: true });
  }
  
  return controller.signal;
}

/**
 * Clear all active requests (useful for logout or manual cleanup)
 */
export function clearAllActiveRequests() {
  console.log('🧹 Clearing all active requests...');
  activeRequests.forEach(controller => controller.abort('Manual cleanup'));
  activeRequests.clear();
}
