import { useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

export function useLoadingWatchdog(
  isLoading: boolean,
  message = 'This is taking longer than expected. Try refreshing.',
  timeoutMs = 12_000
) {
  const { toast } = useToast();
  const hasShownRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (!isLoading) {
      hasShownRef.current = false;
      return;
    }

    const timer = window.setTimeout(() => {
      if (hasShownRef.current) {
        return;
      }

      toast({
        title: 'Still working...',
        description: message,
        variant: 'destructive',
      });
      hasShownRef.current = true;
    }, timeoutMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isLoading, message, timeoutMs, toast]);
}
