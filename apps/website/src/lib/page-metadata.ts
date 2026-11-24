import type { Metadata } from 'next';
import { routing } from '@/i18n/routing';

export const SITE_URL = (process.env.SITE_URL ?? 'https://eulimousine.com').replace(/\/$/, '');

/** `/en` + path, e.g. path '/fleet' → '/en/fleet'; path '' → '/en'. */
export const localePath = (locale: string, path: string) => `/${locale}${path}`;

/**
 * Per-page title, description, canonical URL and hreflang links (all 7 languages + x-default → English).
 * Every page sets its own canonical; the layout's canonical is only the home page's.
 */
export function pageMetadata({
  locale,
  path,
  title,
  description,
  noindex = false,
  image,
}: {
  locale: string;
  path: string;
  title: string;
  description?: string;
  noindex?: boolean;
  image?: string;
}): Metadata {
  const languages = Object.fromEntries(routing.locales.map((l) => [l, `${SITE_URL}${localePath(l, path)}`]));
  return {
    title,
    description,
    alternates: { canonical: localePath(locale, path), languages: { ...languages, 'x-default': `${SITE_URL}${localePath('en', path)}` } },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}${localePath(locale, path)}`,
      siteName: 'EU Limousine',
      locale,
      type: 'website',
      ...(image ? { images: [{ url: image }] } : {}),
    },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}
