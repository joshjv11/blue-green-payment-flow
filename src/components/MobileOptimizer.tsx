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

    // Prefetch critical routes for authenticated users
    if (user) {
      const criticalRoutes = ['/dashboard', '/bills', '/analytics', '/settings'];
      const prefetchLinks: HTMLLinkElement[] = [];
      
      criticalRoutes.forEach(route => {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = route;
        document.head.appendChild(link);
        prefetchLinks.push(link);
      });

      // Optimize touch events for better mobile responsiveness
      document.addEventListener('touchstart', () => {}, { passive: true });
      document.addEventListener('touchmove', () => {}, { passive: true });
      
      return () => {
        // Cleanup only the prefetch links we created
        prefetchLinks.forEach(link => {
          if (link.parentNode) {
            link.parentNode.removeChild(link);
          }
        });
      };
    } else {
      // For unauthenticated users, prefetch auth page
      const authLink = document.createElement('link');
      authLink.rel = 'prefetch';  
      authLink.href = '/auth';
      document.head.appendChild(authLink);

      return () => {
        if (authLink.parentNode) {
          authLink.parentNode.removeChild(authLink);
        }
      };
    }
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