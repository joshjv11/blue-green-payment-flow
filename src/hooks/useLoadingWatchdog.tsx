/**
 * Loading Watchdog Hook
 * Detects when queries are stuck in loading state > 15s and shows retry toast
 */

import { useEffect, useRef } from 'react';
import { useIsFetching, useIsMutating } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { refetchAllQueries } from '@/lib/query';

const LOADING_TIMEOUT_MS = 15000; // 15 seconds

interface UseLoadingWatchdogOptions {
  enabled?: boolean;
  onTimeout?: () => void;
}

export function useLoadingWatchdog(options: UseLoadingWatchdogOptions = {}) {
  const { enabled = true, onTimeout } = options;
  const { toast } = useToast();
  
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();
  const isLoading = isFetching > 0 || isMutating > 0;
  
  const timeoutRef = useRef<NodeJS.Timeout>();
  const hasShownToastRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Reset toast flag when loading stops
    if (!isLoading) {
      hasShownToastRef.current = false;
      return;
    }

    // Set new timeout when loading starts
    timeoutRef.current = setTimeout(() => {
      if (isLoading && !hasShownToastRef.current) {
        console.warn('⚠️ Loading watchdog triggered - stuck state detected');
        hasShownToastRef.current = true;

        toast({
          title: 'Loading is taking longer than expected',
          description: 'Click to retry and refresh your data.',
          variant: 'destructive',
          action: (
            <button
              onClick={async () => {
                console.log('🔄 Manual retry triggered');
                await refetchAllQueries();
                hasShownToastRef.current = false;
              }}
              className="px-3 py-2 text-sm font-medium bg-white text-destructive rounded hover:bg-gray-100"
            >
              Retry
            </button>
          ),
          duration: 10000, // 10 seconds
        });

        onTimeout?.();
      }
    }, LOADING_TIMEOUT_MS);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isLoading, enabled, toast, onTimeout]);

  return {
    isLoading,
    isFetching: isFetching > 0,
    isMutating: isMutating > 0,
  };
}
