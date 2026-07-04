import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { AppUser, AuthSession } from '@/lib/types/auth';
import {
  bootstrapSession,
  onSessionChange,
  onSessionExpired,
  setAccessToken,
  getCurrentSession,
} from '@/lib/apiClient';
import * as authApi from '@/lib/endpoints/auth';
import { useToast } from '@/hooks/use-toast';

export type User = AppUser;

export interface Session {
  access_token: string;
  user: User;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    fullName?: string,
    orgName?: string
  ) => Promise<{ session: Session | null; requiresEmailConfirmation: boolean }>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  updateProfile: (fullName: string, orgName?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function toSession(data: AuthSession): Session {
  return { access_token: data.token, user: data.user };
}

function applyAuthSession(
  data: AuthSession | null,
  setUser: (u: User | null) => void,
  setSession: (s: Session | null) => void
): void {
  if (data) {
    setAccessToken(data.token);
    setUser(data.user);
    setSession(toSession(data));
  } else {
    setAccessToken(null);
    setUser(null);
    setSession(null);
  }
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const restored = await bootstrapSession();
      if (cancelled) return;
      if (restored) {
        applyAuthSession(restored, setUser, setSession);
      }
      setLoading(false);
    })();

    const unsubSession = onSessionChange((data) => {
      if (!cancelled) applyAuthSession(data, setUser, setSession);
    });

    const unsubExpired = onSessionExpired(() => {
      if (!cancelled) {
        setUser(null);
        setSession(null);
      }
    });

    return () => {
      cancelled = true;
      unsubSession();
      unsubExpired();
    };
  }, []);

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      fullName?: string,
      orgName?: string
    ): Promise<{ session: Session | null; requiresEmailConfirmation: boolean }> => {
      try {
        setLoading(true);
        const data = await authApi.signUp(email, password, fullName, orgName);
        applyAuthSession(data, setUser, setSession);
        return { session: toSession(data), requiresEmailConfirmation: !data.user.verified };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to create account.';
        toast({ title: 'Error creating account', description: message, variant: 'destructive' });
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        setLoading(true);
        const data = await authApi.signIn(email, password);
        applyAuthSession(data, setUser, setSession);
        toast({ title: 'Welcome back!', description: "You've successfully signed in." });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Sign in failed.';
        toast({ title: 'Sign in failed', description: message, variant: 'destructive' });
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  const signOut = useCallback(async () => {
    await authApi.signOut();
    applyAuthSession(null, setUser, setSession);
  }, []);

  const requestPasswordReset = useCallback(
    async (email: string) => {
      try {
        await authApi.forgotPassword(email);
        toast({
          title: 'Password reset email sent!',
          description: 'If that email exists, a reset link has been sent.',
        });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to send reset email.';
        toast({ title: 'Error sending reset email', description: message, variant: 'destructive' });
        throw error;
      }
    },
    [toast]
  );

  const resendVerification = useCallback(async () => {
    try {
      await authApi.resendVerification();
      toast({
        title: 'Verification email sent',
        description: 'Check your inbox for the verification link.',
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to send verification email.';
      toast({ title: 'Error', description: message, variant: 'destructive' });
      throw error;
    }
  }, [toast]);

  const updateProfile = useCallback(
    async (fullName: string, orgName?: string) => {
      if (!user) throw new Error('No user logged in');
      try {
        setLoading(true);
        const updated = await authApi.updateProfile(fullName, orgName);
        setUser(updated);
        if (session) {
          setSession({ ...session, user: updated });
        }
        toast({ title: 'Profile updated successfully!' });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Update failed.';
        toast({ title: 'Error updating profile', description: message, variant: 'destructive' });
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [user, session, toast]
  );

  const value: AuthContextType = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    requestPasswordReset,
    resendVerification,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export function getCurrentUser(): User | null {
  return getCurrentSession()?.user ?? null;
}

export { getAccessToken as getCurrentToken, getCurrentSession } from '@/lib/apiClient';
