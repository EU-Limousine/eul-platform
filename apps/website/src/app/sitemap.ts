import type { MetadataRoute } from 'next';
import { SERVICE_PAGES } from '@/components/page/services-data';
import { routing } from '@/i18n/routing';
import { SITE_URL } from '@/lib/page-metadata';

/**
 * sitemap.xml: every public page in all 7 languages, each with its language siblings (hreflang).
 * Booking steps, confirmation, preview, blog (empty) and legal drafts are left out on purpose.
 */
const PATHS = ['', '/services', ...SERVICE_PAGES.map((s) => `/services/${s.slug}`), '/business', '/fleet', '/service-areas', '/about', '/faq', '/contact'];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return PATHS.flatMap((path) => {
    const languages = Object.fromEntries(routing.locales.map((l) => [l, `${SITE_URL}/${l}${path}`]));
    return routing.locales.map((locale) => ({
      url: `${SITE_URL}/${locale}${path}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: path === '' ? 1 : path.startsWith('/services/') ? 0.8 : 0.6,
      alternates: { languages: { ...languages, 'x-default': `${SITE_URL}/en${path}` } },
    }));
  });
}
