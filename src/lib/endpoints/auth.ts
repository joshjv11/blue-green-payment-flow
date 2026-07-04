import { apiRequest, setSessionFromAuth, logoutSession } from '@/lib/apiClient';
import type { AppUser, AuthSession } from '@/lib/types/auth';

export type { AppUser, AuthSession };

export async function signIn(email: string, password: string): Promise<AuthSession> {
  const session = await apiRequest<AuthSession>('/auth/signin', {
    method: 'POST',
    body: { email, password },
    skipAuth: true,
    skipRefresh: true,
  });
  setSessionFromAuth(session);
  return session;
}

export async function signUp(
  email: string,
  password: string,
  fullName?: string,
  orgName?: string
): Promise<AuthSession> {
  const session = await apiRequest<AuthSession>('/auth/signup', {
    method: 'POST',
    body: {
      email,
      password,
      full_name: fullName,
      org_name: orgName,
    },
    skipAuth: true,
    skipRefresh: true,
  });
  setSessionFromAuth(session);
  return session;
}

export async function forgotPassword(email: string): Promise<{ ok: boolean; message?: string }> {
  return apiRequest('/auth/forgot-password', {
    method: 'POST',
    body: { email },
    skipAuth: true,
    skipRefresh: true,
  });
}

export async function resetPassword(token: string, password: string): Promise<{ ok: boolean }> {
  return apiRequest('/auth/reset-password', {
    method: 'POST',
    body: { token, password },
    skipAuth: true,
    skipRefresh: true,
  });
}

export async function verifyEmail(token: string): Promise<{ ok: boolean }> {
  return apiRequest('/auth/verify-email', {
    method: 'POST',
    body: { token },
    skipAuth: true,
    skipRefresh: true,
  });
}

export async function resendVerification(): Promise<{ ok: boolean; message?: string }> {
  return apiRequest('/auth/resend-verification', { method: 'POST' });
}

export { updateProfile } from '@/lib/endpoints/profile';

export { logoutSession as signOut };
