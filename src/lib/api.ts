export const API_BASE = import.meta.env.VITE_API_BASE || '';

export async function api<T = any>(path: string, init: RequestInit = {}) {
  const token = localStorage.getItem('jwt') || '';
  const headers = new Headers(init.headers || {});
  if (!headers.has('Content-Type') && init.body && typeof init.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  if (res.status === 204) return null as T;
  return (await res.json()) as T;
}


