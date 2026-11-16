import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

/** Local addresses. Override with env vars if your ports differ. */
export const URLS = {
  website: process.env.E2E_WEBSITE_URL ?? 'http://localhost:3000',
  dashboard: process.env.E2E_DASHBOARD_URL ?? 'http://localhost:5173',
  api: process.env.E2E_API_URL ?? 'http://localhost:8080',
  mailpit: process.env.E2E_MAILPIT_URL ?? 'http://localhost:8025',
};

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
