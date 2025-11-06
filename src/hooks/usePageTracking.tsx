import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackFeatureUsage } from '@/lib/analytics';

/**
 * Hook to track page views automatically
 * Only tracks key pages to avoid memory waste
 */
export function usePageTracking() {
  const location = useLocation();

  useEffect(() => {
    // Only track important pages
    const importantPages: Record<string, string> = {
      '/dashboard': 'Dashboard',
      '/bills': 'Bills',
      '/analytics': 'Analytics',
      '/sales': 'Sales',
      '/purchases': 'Purchases',
      '/gst': 'GST Dashboard',
      '/gstr-filing': 'GSTR Filing',
      '/ai-coach': 'AI Coach',
      '/whatsapp': 'WhatsApp',
      '/inventory': 'Inventory',
      '/expenses': 'Expenses',
      '/reports/financial': 'Financial Reports',
      '/reports/tax': 'Tax Reports',
      '/exports': 'Exports',
    };

    const pageName = importantPages[location.pathname];
    if (pageName) {
      trackFeatureUsage(pageName, 'view', {
        path: location.pathname,
        timestamp: new Date().toISOString(),
      });
    }
  }, [location.pathname]);
}

