import { defineRouting } from 'next-intl/routing';
import { DEFAULT_LOCALE, LOCALES } from '@eul/i18n';

/**
 * D-16 language rules:
 * 1. Saved choice (NEXT_LOCALE cookie) wins.
 * 2. Otherwise match the browser's Accept-Language (de-CH → de, en-GB → en).
 * 3. No match → English.
 * Every URL has a locale prefix (/en/…, /da/…) so each language is indexed.
 */
export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: 'always',
  localeDetection: true,
  localeCookie: { name: 'NEXT_LOCALE', maxAge: 60 * 60 * 24 * 365 },
});
