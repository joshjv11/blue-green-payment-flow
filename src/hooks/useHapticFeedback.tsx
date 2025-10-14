import { useCallback } from 'react';

type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

export const useHapticFeedback = () => {
  const trigger = useCallback((type: HapticType = 'light') => {
    // Check if the Vibration API is supported
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30],
        success: [10, 50, 10],
        warning: [20, 100, 20],
        error: [50, 100, 50],
      };
      
      navigator.vibrate(patterns[type]);
    }
  }, []);

  return { trigger };
};
