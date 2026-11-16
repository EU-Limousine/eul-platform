import { setRequestLocale } from 'next-intl/server';
import { HomeClassic, HomeNoir } from '@/components/home/home-pages';
import { HOME_VARIANT } from '@/config/site';
import { fetchPublicCategories } from '@/lib/public-api';

// Fleet prices refresh every 5 minutes (incremental static regeneration).
export const revalidate = 300;

/** The homepage option is chosen in src/config/site.ts (HOME_VARIANT). */
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const categories = await fetchPublicCategories(locale);

  return (
    <main>
      {HOME_VARIANT === 'noir' ? (
        <HomeNoir categories={categories} locale={locale} />
      ) : (
        <HomeClassic categories={categories} locale={locale} />
      )}
    </main>
  );
}
