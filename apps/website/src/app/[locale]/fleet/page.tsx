import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { VehicleCard } from '@/components/home/fleet';
import { CtaBand, PageHero, Section } from '@/components/page/blocks';
import { GoldLink } from '@/components/ui';
import { pageMetadata } from '@/lib/page-metadata';
import { fetchPublicCategories } from '@/lib/public-api';

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'pages.fleet' });
  return pageMetadata({ locale, path: '/fleet', title: t('metaTitle'), description: t('text'), image: '/images/fleet/eqs-front.jpg' });
}

/** Every active vehicle class, live from the dashboard (never hard-coded). */
export default async function FleetPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('pages.fleet');
  const common = await getTranslations('pages.common');
  const categories = await fetchPublicCategories(locale);

  return (
    <main>
      <PageHero
        eyebrow={t('eyebrow')}
        title={t('title')}
        text={t('text')}
        image="/images/site/about-classic.jpg"
        crumbs={[{ href: '/', label: common('home') }, { label: t('eyebrow') }]}
      >
        <GoldLink href="/book">{common('getPrice')}</GoldLink>
      </PageHero>

      <Section>
        {categories.length > 0 ? (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((c) => (
              <VehicleCard key={c.id} category={c} locale={locale} />
            ))}
          </ul>
        ) : (
          <p className="text-text-muted">{t('empty')}</p>
        )}
        <p className="mt-8 max-w-3xl text-sm text-text-muted">{common('vehicleNote')}</p>
      </Section>
      <CtaBand />
    </main>
  );
}
