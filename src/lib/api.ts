import { NATIVE_FETCH } from './nativeFetch';

const DEFAULT_TIMEOUT = 10_000;

export class ApiError extends Error {
  readonly status?: number;
  readonly statusText?: string;

  constructor(message: string, status?: number, statusText?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.statusText = statusText;
  }
}

const createAbortError = (reason: string) => {
  if (typeof DOMException !== 'undefined') {
    return new DOMException(reason, 'AbortError');
  }

  const error = new Error(reason);
  error.name = 'AbortError';
  return error;
};

export async function apiFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(createAbortError('Timeout')), timeoutMs);

  const { signal: callerSignal, headers: providedHeaders, ...restInit } = init;

  if (callerSignal) {
    if (callerSignal.aborted) {
      controller.abort(callerSignal.reason ?? createAbortError('Aborted'));
    } else {
      callerSignal.addEventListener(
        'abort',
        () => controller.abort(callerSignal.reason ?? createAbortError('Aborted')),
        { once: true },
      );
    }
  }

  let visibilityHandler: (() => void) | undefined;

  if (typeof document !== 'undefined') {
    visibilityHandler = () => {
      if (document.hidden) {
        controller.abort(createAbortError('TabHidden'));
      }
    };

    document.addEventListener('visibilitychange', visibilityHandler);
  }

  const headers = new Headers(providedHeaders ?? {});
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  try {
    const response = await NATIVE_FETCH(input, {
      ...restInit,
      signal: controller.signal,
      headers,
    });

    if (!response.ok) {
      let message = `${response.status} ${response.statusText}`;

      try {
        const text = await response.clone().text();
        if (text) {
          message += ` :: ${text}`;
        }
      } catch (error) {
        console.debug('Failed to read response body for error message', error);
      }

      throw new ApiError(message, response.status, response.statusText);
    }

    return response;
  } finally {
    clearTimeout(timer);

    if (visibilityHandler && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', visibilityHandler);
    }
  }
}
