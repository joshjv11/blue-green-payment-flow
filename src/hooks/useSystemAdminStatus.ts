// Stubbed for MVP — email-based check only, no DB calls.
import { useAuth } from '@/hooks/useAuth';

const ADMIN_EMAIL = 'joshuavaz55@gmail.com';

export function useSystemAdminStatus() {
  const { user } = useAuth();
  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  return { isAdmin, loading: false };
}
