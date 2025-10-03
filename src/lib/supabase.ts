import { createClient } from '@supabase/supabase-js';

// Supabase client configuration - NEW PROJECT
const supabaseUrl = "https://qusloccwftavvcsttmnq.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1c2xvY2N3ZnRhdnZjc3R0bW5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3ODk0MTQsImV4cCI6MjA3NDM2NTQxNH0.8YpZ9eWRA2c96zmMJMOBPpgNWjoKACwpwNGafOsyUS0";

// Check if Supabase is configured
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

// Create Supabase client with proper configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          company: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          company?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          company?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      bills: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          amount: number;
          due_date: string;
          category: string;
          recurring: boolean;
          status: 'unpaid' | 'paid' | 'overdue';
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          name: string;
          amount: number;
          due_date: string;
          category: string;
          recurring?: boolean;
          status?: 'unpaid' | 'paid' | 'overdue';
          notes?: string | null;
        };
        Update: {
          name?: string;
          amount?: number;
          due_date?: string;
          category?: string;
          recurring?: boolean;
          status?: 'unpaid' | 'paid' | 'overdue';
          notes?: string | null;
          updated_at?: string;
        };
      };
    };
  };
};