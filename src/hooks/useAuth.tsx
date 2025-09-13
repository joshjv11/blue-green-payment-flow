import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useLocalStorage } from '@/hooks/useLocalStorage';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string, company?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (fullName: string, company?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock user for localStorage mode
interface MockUser {
  id: string;
  email: string;
  full_name?: string;
  company?: string;
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [localUser, setLocalUser] = useLocalStorage<MockUser | null>('auth_user', null);
  const [localUsers] = useLocalStorage<MockUser[]>('users', []);

  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      // Get initial session
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      });

      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        }
      );

      return () => subscription.unsubscribe();
    } else {
      // Use localStorage mode
      if (localUser) {
        setUser(localUser as any);
      }
      setLoading(false);
    }
  }, [localUser]);

  const signUp = async (email: string, password: string, fullName?: string, company?: string) => {
    try {
      setLoading(true);

      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        if (data.user) {
          // Create profile
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              email: data.user.email!,
              full_name: fullName || null,
              company: company || null,
            });

          if (profileError) throw profileError;

          toast({
            title: "Account created successfully!",
            description: "Please check your email to verify your account.",
          });
        }
      } else {
        // localStorage mode
        const existingUser = localUsers.find(u => u.email === email);
        if (existingUser) {
          throw new Error('User already exists');
        }

        const newUser: MockUser = {
          id: crypto.randomUUID(),
          email,
          full_name: fullName,
          company,
        };

        setLocalUser(newUser);
        setUser(newUser as any);

        toast({
          title: "Account created successfully!",
          description: "You're now logged in with local storage.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error creating account",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);

      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        toast({
          title: "Welcome back!",
          description: "You've successfully signed in.",
        });
      } else {
        // localStorage mode - simplified login (just check if user exists)
        const existingUser = localUsers.find(u => u.email === email);
        if (!existingUser) {
          throw new Error('User not found. Please sign up first.');
        }

        setLocalUser(existingUser);
        setUser(existingUser as any);

        toast({
          title: "Welcome back!",
          description: "You've successfully signed in.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error signing in",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      } else {
        // localStorage mode
        setLocalUser(null);
        setUser(null);
      }

      toast({
        title: "Signed out successfully",
        description: "You've been logged out of your account.",
      });
    } catch (error: any) {
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateProfile = async (fullName: string, company?: string) => {
    try {
      if (!user) throw new Error('No user logged in');

      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase
          .from('profiles')
          .update({
            full_name: fullName,
            company: company || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        if (error) throw error;
      } else {
        // localStorage mode
        const updatedUser = { ...localUser, full_name: fullName, company } as MockUser;
        setLocalUser(updatedUser);
        setUser(updatedUser as any);
      }

      toast({
        title: "Profile updated successfully!",
        description: "Your profile information has been saved.",
      });
    } catch (error: any) {
      toast({
        title: "Error updating profile",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
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