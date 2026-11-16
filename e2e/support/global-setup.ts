import { ADMIN, URLS } from './env';

/** Fails fast with a clear message when something isn't running. */
export default async function globalSetup(): Promise<void> {
  if (!ADMIN.email || !ADMIN.password) {
    throw new Error('SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not found in .env');
  }
  const checks: [string, string][] = [
    ['API', `${URLS.api}/health`],
    ['Worker', 'http://localhost:8082/health'],
    ['Website', `${URLS.website}/en`],
    ['Dashboard', URLS.dashboard],
    ['Mailpit', `${URLS.mailpit}/api/v1/messages?limit=1`],
  ];
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
    throw new Error(`Start these first (docker compose up -d, npx turbo run dev):\n  - ${down.join('\n  - ')}`);
  }
}
