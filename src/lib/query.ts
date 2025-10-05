/**
 * Centralized React Query configuration
 * Prevents infinite loading states and stuck queries
 */

import { QueryClient, QueryClientConfig } from '@tanstack/react-query';

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

export const queryClientConfig: QueryClientConfig = {
  defaultOptions: {
    queries: {
      // Refetch on window focus to keep data fresh
      refetchOnWindowFocus: true,
      
      // Refetch on reconnect
      refetchOnReconnect: true,
      
      // Limited retries to prevent infinite loops
      retry: MAX_RETRIES,
      retryDelay: (attemptIndex) => Math.min(RETRY_DELAY_MS * 2 ** attemptIndex, 5000),
      
      // Stale time (data considered fresh for 30 seconds)
      staleTime: 30 * 1000,
      
      // Cache time (data kept in cache for 5 minutes)
      gcTime: 5 * 60 * 1000,
      
      // Network mode
      networkMode: 'online',
    },
    mutations: {
      retry: 1, // Retry mutations once
      retryDelay: RETRY_DELAY_MS,
      networkMode: 'online',
    },
  },
};

// Singleton QueryClient instance
let queryClientInstance: QueryClient | null = null;

export function getQueryClient(): QueryClient {
  if (!queryClientInstance) {
    queryClientInstance = new QueryClient(queryClientConfig);
  }
  return queryClientInstance;
}

/**
 * Helper to invalidate and refetch all queries
 * Useful for retry buttons
 */
export async function refetchAllQueries() {
  const client = getQueryClient();
  await client.invalidateQueries();
  await client.refetchQueries({ type: 'active' });
}

/**
 * Helper to cancel all queries
 * Useful before refetching or on logout
 */
export function cancelAllQueries() {
  const client = getQueryClient();
  client.cancelQueries();
}
