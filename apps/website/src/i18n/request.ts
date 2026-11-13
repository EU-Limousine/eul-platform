import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

type Messages = { [key: string]: string | Messages };

/** Missing translations fall back to English, never to a key name. */
function mergeOverEnglish(english: Messages, translated: Messages): Messages {
  const result: Messages = { ...english };
  for (const [key, value] of Object.entries(translated)) {
    const base = english[key];
    result[key] =
      typeof value === 'object' && typeof base === 'object' ? mergeOverEnglish(base, value) : value;
  }
  return result;
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  const english = (await import('../../messages/en.json')).default as Messages;
  if (locale === 'en') return { locale, messages: english };

  const translated = (await import(`../../messages/${locale}.json`)).default as Messages;
  return { locale, messages: mergeOverEnglish(english, translated) };
});
