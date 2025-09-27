import { useCallback } from 'react';

interface AnalyticsEvent {
  [key: string]: any;
}

export const useAnalytics = () => {
  const track = useCallback((eventName: string, properties: AnalyticsEvent = {}) => {
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Analytics:', eventName, properties);
    }

    // Here you would integrate with your analytics service
    // Examples: Google Analytics, Mixpanel, PostHog, etc.
    
    try {
      // Example: Google Analytics 4
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', eventName, properties);
      }

      // Example: PostHog
      if (typeof window !== 'undefined' && window.posthog) {
        window.posthog.capture(eventName, properties);
      }

      // Example: Custom analytics endpoint
      // fetch('/api/analytics', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ event: eventName, properties })
      // });

    } catch (error) {
      console.warn('Analytics tracking failed:', error);
    }
  }, []);

  return { track };
};

// Extend window type for analytics
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    posthog?: {
      capture: (eventName: string, properties?: AnalyticsEvent) => void;
    };
  }
}