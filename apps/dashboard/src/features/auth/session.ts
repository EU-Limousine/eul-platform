import { apiUrl, configureHttp, http } from '@eul/api-client';
import { runtimeConfig } from '@/shared/config/runtime';
import { useAuthStore, type SessionUser } from './auth-store';

// TODO: switch to the Orval-generated auth hooks once `npm run api:generate` has run.
interface TokenResponse {
  accessToken: string;
  expiresIn: number;
  user: SessionUser;
}

/** Uses the HttpOnly refresh cookie to get a new access token. */
export async function refreshSession(): Promise<boolean> {
  try {
    const res = await fetch(apiUrl('/auth/refresh'), { method: 'POST', credentials: 'include' });
    if (!res.ok) {
      useAuthStore.getState().clear();
      return false;
    }
    const body = (await res.json()) as TokenResponse;
    useAuthStore.getState().setSession(body.accessToken, body.user);
    return true;
  } catch {
    return false;
  }
}

export async function login(email: string, password: string): Promise<void> {
  const body = await http<TokenResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, app: 'dashboard' }),
  });
  useAuthStore.getState().setSession(body.accessToken, body.user);
}

export async function logout(): Promise<void> {
  try {
    await http<void>('/auth/logout', { method: 'POST' });
  } finally {
    useAuthStore.getState().clear();
  }
}

/** On page load the token is gone (memory only); try the refresh cookie once. */
let restoring: Promise<boolean> | null = null;
export function ensureSession(): Promise<boolean> {
  if (useAuthStore.getState().accessToken) return Promise.resolve(true);
  restoring ??= refreshSession().finally(() => {
    restoring = null;
  });
  return restoring;
}

export function setupHttp(onSessionExpired: () => void): void {
  configureHttp({
    baseUrl: runtimeConfig.apiUrl,
    getAccessToken: () => useAuthStore.getState().accessToken,
    refresh: refreshSession,
    onSessionExpired: () => {
      useAuthStore.getState().clear();
      onSessionExpired();
    },
  });
}
