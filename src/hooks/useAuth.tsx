import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

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

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    console.log('🔐 Auth: Initializing Supabase auth state management...');
    
    // Set up auth state listener FIRST to catch all events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        console.log('🔐 Auth state changed:', event, session?.user?.email || 'No user');
        
        // Update state with session data from Supabase
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Handle different auth events
        switch (event) {
          case 'SIGNED_IN':
            console.log('✅ User signed in successfully');
            // Create profile if this is a new signup (user_metadata exists)
            if (session?.user?.user_metadata?.full_name && session?.user?.created_at) {
              const userCreatedAt = new Date(session.user.created_at);
              const now = new Date();
              const timeDiff = now.getTime() - userCreatedAt.getTime();
              
              // If user was created within the last 5 minutes, likely a new signup
              if (timeDiff < 5 * 60 * 1000) {
                console.log('👤 Creating profile for new user:', session.user.email);
                try {
                  const { error: profileError } = await supabase
                    .from('profiles')
                    .insert({
                      id: session.user.id,
                      email: session.user.email!,
                      full_name: session.user.user_metadata?.full_name || null,
                      company: session.user.user_metadata?.company || null,
                    });
                  
                  if (profileError) {
                    console.warn('⚠️ Profile creation error (might already exist):', profileError);
                  } else {
                    console.log('✅ Profile created successfully');
                  }
                } catch (error) {
                  console.error('❌ Error creating profile:', error);
                }
              }
            }
            break;
            
          case 'SIGNED_OUT':
            console.log('👋 User signed out');
            break;
            
          case 'TOKEN_REFRESHED':
            console.log('🔄 Token refreshed successfully');
            break;
            
          default:
            console.log('🔐 Auth event:', event);
        }
      }
    );

    // THEN check for existing session
    const initializeSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('❌ Error getting session:', error);
          throw error;
        }
        
        console.log('🔐 Initial session check:', session?.user?.email || 'No session found');
        setSession(session);
        setUser(session?.user ?? null);
      } catch (error) {
        console.error('❌ Failed to initialize session:', error);
        // Don't throw - just set to null state
        setSession(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeSession();

    // Cleanup subscription on unmount
    return () => {
      console.log('🔐 Cleaning up auth subscription');
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName?: string, company?: string) => {
    try {
      setLoading(true);
      console.log('🔐 Attempting signup for:', email);
      
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
            company: company,
          }
        }
      });

      if (error) {
        console.error('❌ Signup error:', error);
        throw error;
      }

      console.log('✅ Signup successful for:', data.user?.email);
      
      // Check if email confirmation is required
      if (data.user && !data.session) {
        toast({
          title: "Account created successfully!",
          description: "Please check your email to verify your account before signing in.",
        });
      } else {
        toast({
          title: "Account created and signed in!",
          description: "Welcome to InvoiceFlow!",
        });
      }
    } catch (error: any) {
      console.error('❌ Signup failed:', error);
      
      let errorMessage = 'Failed to create account. Please try again.';
      
      if (error.message?.includes('User already registered')) {
        errorMessage = 'An account with this email already exists. Please try signing in instead.';
      } else if (error.message?.includes('Password should be')) {
        errorMessage = 'Password must be at least 6 characters long.';
      } else if (error.message?.includes('Invalid email')) {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error creating account",
        description: errorMessage,
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
      console.log('🔐 Attempting signin for:', email);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('❌ Signin error:', error);
        throw error;
      }

      console.log('✅ Signin successful for:', data.user?.email);
      
      toast({
        title: "Welcome back!",
        description: "You've successfully signed in.",
      });
    } catch (error: any) {
      console.error('❌ Signin failed:', error);
      
      let errorMessage = 'Failed to sign in. Please try again.';
      
      if (error.message?.includes('Invalid login credentials')) {
        errorMessage = 'Invalid email or password. Please check your credentials and try again.';
      } else if (error.message?.includes('Email not confirmed')) {
        errorMessage = 'Please check your email and click the confirmation link before signing in.';
      } else if (error.message?.includes('Too many requests')) {
        errorMessage = 'Too many login attempts. Please wait a moment before trying again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error signing in",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      console.log('🔐 Signing out user...');
      setLoading(true);
      
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('❌ Signout error:', error);
        throw error;
      }
      
      console.log('✅ Signout successful');
      
      // Clear local state immediately
      setSession(null);
      setUser(null);
      
      toast({
        title: "Signed out successfully",
        description: "You've been logged out of your account.",
      });
    } catch (error: any) {
      console.error('❌ Signout failed:', error);
      toast({
        title: "Error signing out",
        description: error.message || 'Failed to sign out. Please try again.',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (fullName: string, company?: string) => {
    try {
      if (!user) {
        throw new Error('No user logged in');
      }
      
      console.log('👤 Updating profile for user:', user.email);
      setLoading(true);

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          company: company || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        console.error('❌ Profile update error:', error);
        throw error;
      }

      console.log('✅ Profile updated successfully');
      toast({
        title: "Profile updated successfully!",
        description: "Your profile information has been saved.",
      });
    } catch (error: any) {
      console.error('❌ Profile update failed:', error);
      toast({
        title: "Error updating profile",
        description: error.message || 'Failed to update profile. Please try again.',
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
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