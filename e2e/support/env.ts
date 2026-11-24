import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Where the tests run: "local" (default, everything on your machine) or "staging"
 * (the deploy-staging workflow sets E2E_TARGET=staging and the staging URLs).
 */
export const TARGET = (process.env.E2E_TARGET ?? 'local') as 'local' | 'staging';
export const IS_LOCAL = TARGET === 'local';

/** Local addresses. Override with env vars if your ports differ. */
export const URLS = {
  website: process.env.E2E_WEBSITE_URL ?? 'http://localhost:3000',
  dashboard: process.env.E2E_DASHBOARD_URL ?? 'http://localhost:5173',
  api: process.env.E2E_API_URL ?? 'http://localhost:8080',
  mailpit: process.env.E2E_MAILPIT_URL ?? 'http://localhost:8025',
};

// These tests create bookings, drivers and vehicles. They must never touch production.
const PRODUCTION_HOSTS = ['eulimousine.com', 'www.eulimousine.com', 'app.eulimousine.com', 'api.eulimousine.com'];
for (const url of Object.values(URLS)) {
  if (PRODUCTION_HOSTS.includes(new URL(url).hostname)) {
    throw new Error(`Refusing to run end-to-end tests against production (${url}). Use staging or local.`);
  }
}

/** Reads the admin login from the repo's .env (never hard-coded here). */
function readDotEnv(): Record<string, string> {
  const file = path.resolve(__dirname, '../../.env');
  if (!existsSync(file)) return {};
  const values: Record<string, string> = {};
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (match?.[1]) values[match[1]] = (match[2] ?? '').replace(/^["']|["']$/g, '');
  }
  return values;
}

const dotEnv = readDotEnv();

export const ADMIN = {
  email: process.env.SEED_ADMIN_EMAIL ?? dotEnv.SEED_ADMIN_EMAIL ?? '',
  password: process.env.SEED_ADMIN_PASSWORD ?? dotEnv.SEED_ADMIN_PASSWORD ?? '',
};

/** Unique suffix so repeated runs never clash (plates, emails). */
export function uniqueId(): string {
  return `${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`.toUpperCase();
}
