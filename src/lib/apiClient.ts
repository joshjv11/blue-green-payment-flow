import type { AuthSession } from '@/lib/types/auth';

/** Use same-origin on deployed hosts so Vercel/Netlify rewrites proxy to the API (avoids CORS). */
function resolveApiBase(): string {
  const configured = import.meta.env.VITE_API_BASE?.trim().replace(/\/$/, '') ?? '';

  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const isLocal = host === 'localhost' || host === '127.0.0.1';
    if (!isLocal) {
      return '';
    }
    return configured || 'http://localhost:8787';
  }

  if (import.meta.env.PROD) {
    return configured;
  }
  return configured || 'http://localhost:8787';
}

const API_BASE = resolveApiBase();

let accessToken: string | null = null;
let currentSession: AuthSession | null = null;
let refreshPromise: Promise<AuthSession | null> | null = null;

type SessionListener = (session: AuthSession | null) => void;
type ExpiredListener = () => void;

const sessionListeners = new Set<SessionListener>();
const expiredListeners = new Set<ExpiredListener>();

export function getApiBase(): string {
  return API_BASE;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function getCurrentSession(): AuthSession | null {
  return currentSession;
}

export function onSessionChange(listener: SessionListener): () => void {
  sessionListeners.add(listener);
  return () => sessionListeners.delete(listener);
}

export function onSessionExpired(listener: ExpiredListener): () => void {
  expiredListeners.add(listener);
  return () => expiredListeners.delete(listener);
}

function applySession(session: AuthSession | null): void {
  currentSession = session;
  accessToken = session?.token ?? null;
  for (const listener of sessionListeners) {
    listener(session);
  }
}

function notifyExpired(): void {
  applySession(null);
  for (const listener of expiredListeners) {
    listener();
  }
}

async function refreshSession(): Promise<AuthSession | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });
        if (!res.ok) {
          notifyExpired();
          return null;
        }
        const data = (await res.json()) as AuthSession;
        applySession(data);
        return data;
      } catch {
        notifyExpired();
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  skipAuth?: boolean;
  skipRefresh?: boolean;
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { body, skipAuth, skipRefresh, headers: extraHeaders, ...init } = options;

  const headers = new Headers(extraHeaders);
  if (body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (!skipAuth && accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const url = path.startsWith('http') ? path : `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;

  const doFetch = () =>
    fetch(url, {
      ...init,
      headers,
      credentials: 'include',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

  let res = await doFetch();

  if (res.status === 401 && !skipAuth && !skipRefresh) {
    const refreshed = await refreshSession();
    if (refreshed?.token) {
      headers.set('Authorization', `Bearer ${refreshed.token}`);
      res = await doFetch();
    }
  }

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    if (res.status === 401 && !skipAuth) {
      notifyExpired();
    }
    const errBody = data as { error?: string } | null;
    throw new ApiError(errBody?.error || res.statusText || 'Request failed', res.status, data);
  }

  return data as T;
}

export function setSessionFromAuth(session: AuthSession | null): void {
  applySession(session);
}

export async function bootstrapSession(): Promise<AuthSession | null> {
  return refreshSession();
}

export async function logoutSession(): Promise<void> {
  try {
    await apiRequest('/auth/logout', { method: 'POST', skipRefresh: true });
  } finally {
    applySession(null);
  }
}
