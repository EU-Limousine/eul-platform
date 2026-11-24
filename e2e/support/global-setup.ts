import { ADMIN, IS_LOCAL, TARGET, URLS } from './env';

/** Fails fast with a clear message when something isn't running. */
export default async function globalSetup(): Promise<void> {
  if (!ADMIN.email || !ADMIN.password) {
    throw new Error(
      IS_LOCAL
        ? 'SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not found in .env'
        : `SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD missing for ${TARGET} (GitHub: environment variable E2E_ADMIN_EMAIL, secret E2E_ADMIN_PASSWORD)`,
    );
  }
  const checks: [string, string][] = [
    ['API', `${URLS.api}/health`],
    ['Website', `${URLS.website}/en`],
    ['Dashboard', URLS.dashboard],
  ];
  // The worker and Mailpit are only reachable on your machine; on staging the worker is private
  // and emails go out for real through SMTP.
  if (IS_LOCAL) {
    checks.push(['Worker', 'http://localhost:8082/health'], ['Mailpit', `${URLS.mailpit}/api/v1/messages?limit=1`]);
  }
  const down: string[] = [];
  for (const [name, url] of checks) {
    try {
      const res = await fetch(url);
      if (!res.ok) down.push(`${name} (${url} → ${res.status})`);
    } catch {
      down.push(`${name} (${url} not reachable)`);
    }
  }
  if (down.length) {
    throw new Error(
      IS_LOCAL
        ? `Start these first (docker compose up -d, npx turbo run dev):\n  - ${down.join('\n  - ')}`
        : `${TARGET} is not answering:\n  - ${down.join('\n  - ')}`,
    );
  }
}
