import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { HomeClassic, HomeNoir } from '@/components/home/home-pages';
import { fetchPublicCategories } from '@/lib/public-api';

/**
 * Side-by-side review of both homepage options: /en/preview/classic and /en/preview/noir.
 * The page body uses that option's theme; header and footer keep the site theme.
 * TODO(go-live): delete this folder once an option is chosen.
 */
export const metadata: Metadata = { robots: { index: false, follow: false } };
export const revalidate = 300;

export default async function PreviewPage({ params }: { params: Promise<{ locale: string; variant: string }> }) {
  const { locale, variant } = await params;
  if (variant !== 'classic' && variant !== 'noir') notFound();
  setRequestLocale(locale);
  const categories = await fetchPublicCategories(locale);

  return (
    <main className={`theme-${variant}`}>
      {variant === 'noir' ? <HomeNoir categories={categories} locale={locale} /> : <HomeClassic categories={categories} locale={locale} />}
    </main>
  );
}
