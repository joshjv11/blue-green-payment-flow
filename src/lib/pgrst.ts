export const PGRST_URL = import.meta.env.VITE_PGRST_URL || '';

export async function pgrst<T = any>(path: string, init: RequestInit = {}) {
  if (!PGRST_URL) throw new Error('VITE_PGRST_URL not set');
  const token = localStorage.getItem('jwt') || '';
  const headers = new Headers(init.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(`${PGRST_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return (await res.json()) as T;
}


