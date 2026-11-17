import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

// Message files are plain JSON: text, nested groups and lists (legal page sections).
type MessageValue = string | number | boolean | null | MessageValue[] | Messages;
type Messages = { [key: string]: MessageValue };

function isGroup(value: MessageValue | undefined): value is Messages {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Missing translations fall back to English, never to a key name. Lists are replaced whole. */
function mergeOverEnglish(english: Messages, translated: Messages): Messages {
  const result: Messages = { ...english };
  for (const [key, value] of Object.entries(translated)) {
    const base = english[key];
    result[key] = isGroup(value) && isGroup(base) ? mergeOverEnglish(base, value) : value;
  }
  return result;
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  const english = (await import('../../messages/en.json')).default as unknown as Messages;
  if (locale === 'en') return { locale, messages: english };

  const translated = (await import(`../../messages/${locale}.json`)).default as unknown as Messages;
  return { locale, messages: mergeOverEnglish(english, translated) };
});
