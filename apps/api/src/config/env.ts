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
  PAYMENT_PROVIDER: string;
  TURNSTILE_SECRET: string;
}

function required(raw: Record<string, unknown>, key: string): string {
  const value = raw[key];
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`Missing env var ${key}`);
  return value.trim();
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

  const jwtSecret = required(raw, 'JWT_ACCESS_SECRET');
  if (jwtSecret.length < 32) throw new Error('JWT_ACCESS_SECRET must be at least 32 characters');

  const paymentProvider = (raw.PAYMENT_PROVIDER as string | undefined) ?? 'fake';
  if (nodeEnv === 'production' && paymentProvider === 'fake') {
    throw new Error('FakePaymentProvider is not allowed in production (decision D-01)');
  }

  return {
    NODE_ENV: nodeEnv,
    PORT: int(raw, 'PORT', 8080),
    DATABASE_URL: required(raw, 'DATABASE_URL'),
    REDIS_URL: required(raw, 'REDIS_URL'),
    JWT_ACCESS_SECRET: jwtSecret,
    JWT_ACCESS_TTL: int(raw, 'JWT_ACCESS_TTL', 900),
    REFRESH_TTL_DAYS: int(raw, 'REFRESH_TTL_DAYS', 14),
    CORS_ORIGINS: required(raw, 'CORS_ORIGINS')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    PAYMENT_PROVIDER: paymentProvider,
    TURNSTILE_SECRET: required(raw, 'TURNSTILE_SECRET'),
  };
}
