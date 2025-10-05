const globalScope = globalThis as any;

const fetchFromWindow = () => {
  if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
    return window.fetch.bind(window);
  }
  if (typeof globalScope.fetch === 'function') {
    return globalScope.fetch.bind(globalScope);
  }
  throw new Error('Fetch API is not available in the current environment.');
};

export const NATIVE_FETCH: typeof fetch =
  globalScope.__NATIVE_FETCH__ ?? (globalScope.__NATIVE_FETCH__ = fetchFromWindow());
