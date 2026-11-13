/**
 * The one HTTP function every generated hook uses (Orval mutator).
 * Each app calls configureHttp() once at start-up with its API URL and token functions.
 * Access tokens live in memory only (never localStorage).
 */
export interface ApiErrorBody {
  code: string;
  message: string;
  requestId: string;
  fieldErrors?: Record<string, string[]>;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: ApiErrorBody,
  ) {
    super(body.message);
    this.name = 'ApiError';
  }
}

interface HttpConfig {
  baseUrl: string;
  getAccessToken: () => string | null;
  /** Try to get a new access token (e.g. POST /auth/refresh). Return true on success. */
  refresh: () => Promise<boolean>;
  /** Called when the session is gone for good: send the user to the login screen. */
  onSessionExpired: () => void;
}

let config: HttpConfig = {
  baseUrl: '',
  getAccessToken: () => null,
  refresh: async () => false,
  onSessionExpired: () => undefined,
};

export function configureHttp(next: Partial<HttpConfig>): void {
  config = { ...config, ...next };
}

export function apiUrl(path: string): string {
  return `${config.baseUrl.replace(/\/$/, '')}${path}`;
}

// One refresh at a time, shared by all requests that got a 401 together.
let refreshing: Promise<boolean> | null = null;
function refreshOnce(): Promise<boolean> {
  refreshing ??= config.refresh().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

function send(path: string, init: RequestInit): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = config.getAccessToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  return fetch(apiUrl(path), { ...init, headers, credentials: 'include' });
}

async function toError(res: Response): Promise<ApiError> {
  let body: ApiErrorBody = { code: 'HTTP_ERROR', message: 'Something went wrong. Please try again.', requestId: '' };
  try {
    body = (await res.json()) as ApiErrorBody;
  } catch {
    // non-JSON error (e.g. proxy); keep the generic message
  }
  return new ApiError(res.status, body);
}

export async function http<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res = await send(path, init);

  // 401: one silent refresh, then retry once. Auth endpoints never retry.
  if (res.status === 401 && !path.startsWith('/auth/')) {
    if (await refreshOnce()) {
      res = await send(path, init);
    }
    if (res.status === 401) {
      config.onSessionExpired();
    }
  }

  if (!res.ok) throw await toError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
