import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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