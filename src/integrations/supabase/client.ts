// Re-export the singleton client from the canonical location.
// All imports of "@/integrations/supabase/client" will use the same instance
// that is already configured with JWT injection for PostgREST RLS.
export { supabase } from '@/lib/supabase';
