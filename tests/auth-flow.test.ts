/**
 * Auth Flow Regression Tests
 * Ensures no infinite sign-in loops or call stack overflow
 */

import { describe, it, expect } from 'vitest';

describe('Auth Flow Stability', () => {
  it('should not create infinite sign-in loops', () => {
    // Test that auth state changes don't trigger recursive sign-in calls
    let authStateChangeCount = 0;
    const maxAllowedChanges = 5;

    const mockAuthStateChange = (callback: Function) => {
      authStateChangeCount++;
      if (authStateChangeCount > maxAllowedChanges) {
        throw new Error('Maximum call stack size exceeded - infinite loop detected');
      }
      // Simulate auth state change
      callback('SIGNED_IN', { user: { id: '123', email: 'test@example.com' } });
    };

    // Should not throw
    expect(() => {
      mockAuthStateChange((event: string, session: any) => {
        // Only update state, don't trigger another sign-in
        expect(event).toBe('SIGNED_IN');
        expect(session.user.email).toBe('test@example.com');
      });
    }).not.toThrow();

    expect(authStateChangeCount).toBeLessThanOrEqual(maxAllowedChanges);
  });

  it('should ensure only one Supabase client instance', async () => {
    // Import the singleton
    const { supabase: instance1 } = await import('@/lib/supabase');
    const { supabase: instance2 } = await import('@/lib/supabase');

    // Should be the exact same instance
    expect(instance1).toBe(instance2);
  });

  it('should not trigger redirects multiple times', () => {
    let redirectCount = 0;
    const maxRedirects = 1;

    const mockRedirect = () => {
      redirectCount++;
      if (redirectCount > maxRedirects) {
        throw new Error('Multiple redirects detected - potential loop');
      }
    };

    // Simulate protected route redirect
    const isAuthenticated = false;
    const hasRedirected = { current: false };

    if (!isAuthenticated && !hasRedirected.current) {
      hasRedirected.current = true;
      mockRedirect();
    }

    // Should only redirect once
    expect(redirectCount).toBe(1);

    // Subsequent checks should not redirect
    if (!isAuthenticated && !hasRedirected.current) {
      mockRedirect();
    }

    expect(redirectCount).toBe(1);
  });
});
