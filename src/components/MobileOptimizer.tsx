import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePaymentVerification } from '@/hooks/usePaymentVerification';
import { useRealTimePaymentStatus } from '@/hooks/useRealTimePaymentStatus';

/**
 * Mobile optimization component that handles:
 * - Instant logout performance
 * - Real-time payment status updates
 * - Background payment verification
 * - Minimal re-renders and state updates
 */
const MobileOptimizer = () => {
  const { user } = useAuth();
  
  // Enable payment verification only for authenticated users
  const { hasPendingPayments } = usePaymentVerification();
  const paymentStatus = useRealTimePaymentStatus();

  // Performance optimizations for mobile
  useEffect(() => {
    // Optimize viewport for mobile devices
    const viewport = document.querySelector('meta[name=viewport]');
    if (viewport) {
      viewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');
    }

    // Prefetch critical routes for faster navigation
    if (user) {
      const criticalRoutes = ['/dashboard', '/bills', '/settings'];
      criticalRoutes.forEach(route => {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = route;
        document.head.appendChild(link);
      });
    }

    // Optimize touch events for better mobile responsiveness
    document.addEventListener('touchstart', () => {}, { passive: true });
    
    return () => {
      // Cleanup prefetch links
      const prefetchLinks = document.querySelectorAll('link[rel="prefetch"]');
      prefetchLinks.forEach(link => link.remove());
    };
  }, [user]);

  // Debug logging for mobile optimization (can be removed in production)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('📱 Mobile Optimizer Status:', {
        user: user?.email || 'Not authenticated',
        hasPendingPayments,
        paymentStatus: paymentStatus.lastPaymentStatus || 'None',
        pendingCount: paymentStatus.pendingCount,
      });
    }
  }, [user, hasPendingPayments, paymentStatus]);

  // This component doesn't render anything - it's just for optimization
  return null;
};

export default MobileOptimizer;