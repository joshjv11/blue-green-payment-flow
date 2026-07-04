import { apiRequest, setSessionFromAuth, logoutSession } from '@/lib/apiClient';
import type { AppUser, AuthSession } from '@/lib/types/auth';

export type { AppUser, AuthSession };

export async function signIn(email: string, password: string): Promise<AuthSession> {
  const raw = await apiRequest<AuthSession & { user?: Record<string, unknown> }>('/auth/signin', {
    method: 'POST',
    body: { email, password },
    skipAuth: true,
    skipRefresh: true,
  });
  const session = normalizeAuthSession(raw);
  setSessionFromAuth(session);
  return session;
}

export async function signUp(
  email: string,
  password: string,
  fullName?: string,
  orgName?: string
): Promise<AuthSession> {
  const raw = await apiRequest<AuthSession & { user?: Record<string, unknown> }>('/auth/signup', {
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
  const session = normalizeAuthSession(raw);
  setSessionFromAuth(session);
  return session;
}

/** Accept new API shape or legacy auth-api responses until Render redeploys. */
function normalizeAuthSession(raw: AuthSession & { user?: Record<string, unknown> }): AuthSession {
  const user = raw.user;
  if (user && typeof user.org_id === 'string' && user.org_id.length > 0) {
    return raw as AuthSession;
  }
  const legacy = user as Record<string, unknown> | undefined;
  const meta = legacy?.user_metadata as { full_name?: string } | undefined;
  return {
    token: raw.token,
    user: {
      id: String(legacy?.id ?? ''),
      email: String(legacy?.email ?? ''),
      full_name: (legacy?.full_name as string | null | undefined) ?? meta?.full_name ?? null,
      org_id: typeof legacy?.org_id === 'string' ? legacy.org_id : '',
      role: typeof legacy?.role === 'string' ? legacy.role : 'owner',
      plan: typeof legacy?.plan === 'string' ? legacy.plan : 'free',
      verified: legacy?.verified === true || legacy?.emailverifiedat != null,
    },
  };
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
