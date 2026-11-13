/** Website and content languages (D-16). English is the default and the x-default. */
export const LOCALES = ['en', 'da', 'de', 'fr', 'es', 'it', 'rm'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

/** Names shown in the language switcher, each in its own language. */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  da: 'Dansk',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español',
  it: 'Italiano',
  rm: 'Rumantsch',
};

export const TIME_ZONE = 'Europe/Copenhagen';

export function isLocale(value: string | undefined): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}
