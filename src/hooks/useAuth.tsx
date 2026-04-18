import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { AppUser } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

// ---------------------------------------------------------------------------
// Local types (replaces @supabase/supabase-js User / Session)
// ---------------------------------------------------------------------------

export interface User extends AppUser {}

export interface Session {
  access_token: string;
  user: User;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string, company?: string) => Promise<{ session: Session | null; requiresEmailConfirmation: boolean }>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signInWithMagicLink: (email: string) => Promise<void>;
  updateProfile: (fullName: string, company?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const API_BASE = (() => {
  try {
    return (import.meta as any).env?.VITE_API_BASE as string || 'http://localhost:8787';
  } catch {
    return 'http://localhost:8787';
  }
})();

function saveSession(token: string, user: User) {
  localStorage.setItem('invoiceflow_jwt', token);
  localStorage.setItem('invoiceflow_user', JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem('invoiceflow_jwt');
  localStorage.removeItem('invoiceflow_user');
}

function loadSession(): { token: string; user: User } | null {
  const token = localStorage.getItem('invoiceflow_jwt');
  const raw = localStorage.getItem('invoiceflow_user');
  if (!token || !raw) return null;
  try {
    const user: User = JSON.parse(raw);
    // Basic JWT expiry check (without a library)
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      clearSession();
      return null;
    }
    return { token, user };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // On mount: restore session from localStorage
  useEffect(() => {
    console.log('🔐 Auth: Restoring session from localStorage...');
    const saved = loadSession();
    if (saved) {
      console.log('🔐 Session restored for:', saved.user.email);
      setUser(saved.user);
      setSession({ access_token: saved.token, user: saved.user });
    } else {
      console.log('🔐 No valid session found');
    }
    setLoading(false);
  }, []);

  const signUp = async (email: string, password: string, fullName?: string, company?: string): Promise<{ session: Session | null; requiresEmailConfirmation: boolean }> => {
    try {
      setLoading(true);
      console.log('🔐 Attempting signup for:', email);

      const res = await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, full_name: fullName, company }),
      });

      const data = await res.json();

      if (!res.ok) {
        const message = data.error || 'Failed to create account. Please try again.';
        toast({ title: 'Error creating account', description: message, variant: 'destructive' });
        throw new Error(message);
      }

      const { token, user: newUser } = data as { token: string; user: User };
      saveSession(token, newUser);
      setUser(newUser);
      const sess: Session = { access_token: token, user: newUser };
      setSession(sess);

      console.log('✅ Signup successful for:', newUser.email);

      // Seed sample data for new user
      try {
        await supabase.rpc('add_sample_data_for_user', { target_user_id: newUser.id });
        console.log('✅ Sample data seeded');
      } catch (seedErr) {
        console.warn('⚠️ Sample data seed failed:', seedErr);
      }

      return { session: sess, requiresEmailConfirmation: false };
    } catch (error: any) {
      console.error('❌ Signup failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      console.log('🔐 Attempting signin for:', email);

      const res = await fetch(`${API_BASE}/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        let message = data.error || 'Sign in failed.';
        if (res.status === 401) message = 'Invalid email or password. Please try again.';
        toast({ title: 'Sign in failed', description: message, variant: 'destructive' });
        throw new Error(message);
      }

      const { token, user: loggedInUser } = data as { token: string; user: User };
      saveSession(token, loggedInUser);
      setUser(loggedInUser);
      const sess: Session = { access_token: token, user: loggedInUser };
      setSession(sess);

      console.log('✅ Signin successful for:', loggedInUser.email);
      toast({ title: 'Welcome back!', description: "You've successfully signed in." });
    } catch (error: any) {
      console.error('❌ Signin failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    console.log('🚪 Signing out...');
    setUser(null);
    setSession(null);
    clearSession();
    console.log('✅ Signed out');
  };

  const resetPassword = async (email: string) => {
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send reset email.');
      }

      toast({ title: 'Password reset email sent!', description: 'Check your email for a reset link.' });
    } catch (error: any) {
      toast({ title: 'Error sending reset email', description: error.message, variant: 'destructive' });
      throw error;
    }
  };

  const signInWithMagicLink = async (email: string) => {
    try {
      const res = await fetch(`${API_BASE}/auth/magic-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send magic link.');
      }

      toast({ title: 'Magic link sent!', description: 'Check your email and click the link to sign in.' });
    } catch (error: any) {
      toast({ title: 'Error sending magic link', description: error.message, variant: 'destructive' });
      throw error;
    }
  };

  const updateProfile = async (fullName: string, company?: string) => {
    if (!user) throw new Error('No user logged in');
    try {
      setLoading(true);
      console.log('👤 Updating profile for:', user.email);

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          company: company || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      // Update local cache
      const updated: User = { ...user, full_name: fullName, company: company || null };
      setUser(updated);
      if (session) {
        setSession({ ...session, user: updated });
      }
      localStorage.setItem('invoiceflow_user', JSON.stringify(updated));

      console.log('✅ Profile updated');
      toast({ title: 'Profile updated successfully!' });
    } catch (error: any) {
      toast({ title: 'Error updating profile', description: error.message, variant: 'destructive' });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    signInWithMagicLink,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
