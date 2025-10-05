import { queryClient } from '@/lib/queryClient';

let initialized = false;

const REFRESH_KEYS = [
  ['profile'],
  ['plan'],
  ['bills'],
];

export function initVisibilityWatcher() {
  if (initialized || typeof document === 'undefined') {
    return;
  }

  initialized = true;

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      queryClient.cancelQueries({ type: 'active' });
      return;
    }

    REFRESH_KEYS.forEach((queryKey) => {
      queryClient.invalidateQueries({ queryKey, exact: false });
    });
  });
}
