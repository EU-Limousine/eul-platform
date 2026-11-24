/** Typed, validated environment. The API refuses to start with a bad config. */
export interface Env {
  NODE_ENV: 'development' | 'test' | 'production';
  PORT: number;
  DATABASE_URL: string;
  REDIS_URL: string;
  JWT_ACCESS_SECRET: string;
  JWT_ACCESS_TTL: number;
  REFRESH_TTL_DAYS: number;
  CORS_ORIGINS: string[];
  /** Public URL of this API (used for the fake payment page). */
  API_PUBLIC_URL: string;
  /** Public URL of the website (payment return page). */
  WEBSITE_URL: string;
  PAYMENT_PROVIDER: string;
  /**
   * Pre-launch only: allows the fake payment provider and Turnstile's test key in production,
   * so the live site can be tested before the payment provider (D-01) is chosen.
   * MUST be removed before real customers book (go-live checklist).
   */
  PRELAUNCH_MODE: boolean;
  /** Signs fake-provider webhooks. Dev/test only. */
  FAKE_PAYMENT_SECRET: string;
  TURNSTILE_SECRET: string;
  /** Server-side key for the Google Routes API. Empty = straight-line estimate (dev only). */
  GOOGLE_MAPS_SERVER_KEY: string;
  /** Currency used when the customer does not choose one (DKK, EUR or USD). */
  DEFAULT_CURRENCY: 'DKK' | 'EUR' | 'USD';
  QUOTE_TTL_MINUTES: number;
  CHECKOUT_TTL_MINUTES: number;
  /** D-07 open: shortest time between booking and pickup. */
  MIN_BOOKING_LEAD_MINUTES: number;
  /** Staff inbox for website enquiries (contact/business/event forms). Empty = stored only, no email. */
  ENQUIRY_EMAIL: string;
}

/** Cloudflare's documented test secret: every token passes. Never allowed in production. */
export const TURNSTILE_TEST_SECRET = '1x0000000000000000000000000000000AA';

function str(raw: Record<string, unknown>, key: string, fallback?: string): string {
  const value = raw[key];
  if (typeof value === 'string' && value.trim() !== '') return value.trim();
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing env var ${key}`);
}

function int(raw: Record<string, unknown>, key: string, fallback: number): number {
  const value = raw[key];
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`Env var ${key} must be a positive integer`);
  return parsed;
}

export function validateEnv(raw: Record<string, unknown>): Env {
  const nodeEnv = (raw.NODE_ENV as Env['NODE_ENV'] | undefined) ?? 'development';
  if (!['development', 'test', 'production'].includes(nodeEnv)) throw new Error('Invalid NODE_ENV');
  const prod = nodeEnv === 'production';

  const jwtSecret = str(raw, 'JWT_ACCESS_SECRET');
  if (jwtSecret.length < 32) throw new Error('JWT_ACCESS_SECRET must be at least 32 characters');

  const prelaunch = str(raw, 'PRELAUNCH_MODE', 'false') === 'true';
  const strict = prod && !prelaunch;

  const paymentProvider = str(raw, 'PAYMENT_PROVIDER', 'fake');
  if (strict && paymentProvider === 'fake') throw new Error('FakePaymentProvider is not allowed in production (D-01)');
  const fakeSecret = str(raw, 'FAKE_PAYMENT_SECRET', 'dev-only-fake-payment-secret');
  if (prod && paymentProvider === 'fake' && fakeSecret === 'dev-only-fake-payment-secret') {
    throw new Error('Set FAKE_PAYMENT_SECRET (from Secret Manager) when using the fake provider in production');
  }

  const turnstileSecret = str(raw, 'TURNSTILE_SECRET');
  if (strict && turnstileSecret === TURNSTILE_TEST_SECRET) throw new Error('Use a real TURNSTILE_SECRET in production');

  const mapsKey = str(raw, 'GOOGLE_MAPS_SERVER_KEY', '');
  if (prod && !mapsKey) throw new Error('GOOGLE_MAPS_SERVER_KEY is required in production');

  const currency = str(raw, 'DEFAULT_CURRENCY', 'EUR');
  if (currency !== 'DKK' && currency !== 'EUR' && currency !== 'USD') throw new Error('DEFAULT_CURRENCY must be DKK, EUR or USD');

  return {
    NODE_ENV: nodeEnv,
    PORT: int(raw, 'PORT', 8080),
    DATABASE_URL: str(raw, 'DATABASE_URL'),
    REDIS_URL: str(raw, 'REDIS_URL'),
    JWT_ACCESS_SECRET: jwtSecret,
    JWT_ACCESS_TTL: int(raw, 'JWT_ACCESS_TTL', 900),
    REFRESH_TTL_DAYS: int(raw, 'REFRESH_TTL_DAYS', 14),
    CORS_ORIGINS: str(raw, 'CORS_ORIGINS')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    API_PUBLIC_URL: str(raw, 'API_PUBLIC_URL', 'http://localhost:8080').replace(/\/$/, ''),
    WEBSITE_URL: str(raw, 'WEBSITE_URL', 'http://localhost:3000').replace(/\/$/, ''),
    PAYMENT_PROVIDER: paymentProvider,
    PRELAUNCH_MODE: prelaunch,
    FAKE_PAYMENT_SECRET: fakeSecret,
    TURNSTILE_SECRET: turnstileSecret,
    GOOGLE_MAPS_SERVER_KEY: mapsKey,
    DEFAULT_CURRENCY: currency,
    QUOTE_TTL_MINUTES: int(raw, 'QUOTE_TTL_MINUTES', 30),
    CHECKOUT_TTL_MINUTES: int(raw, 'CHECKOUT_TTL_MINUTES', 30),
    MIN_BOOKING_LEAD_MINUTES: int(raw, 'MIN_BOOKING_LEAD_MINUTES', 60),
    ENQUIRY_EMAIL: str(raw, 'ENQUIRY_EMAIL', ''),
  };
}
