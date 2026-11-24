import type { Metadata } from 'next';
import { MapPin, Plane, Route } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CtaBand, PageHero, Section } from '@/components/page/blocks';
import { GoldLink } from '@/components/ui';
import { pageMetadata } from '@/lib/page-metadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'pages.areas' });
  return pageMetadata({ locale, path: '/service-areas', title: t('metaTitle'), description: t('text') });
}

/**
 * Where we drive today: Copenhagen and CPH (project brief). Anything else is priced in the
 * booking form. No list of towns or travel times until management confirms them.
 */
export default async function ServiceAreasPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('pages.areas');
  const common = await getTranslations('pages.common');

  const cards = [
    { icon: MapPin, title: t('city.title'), text: t('city.text') },
    { icon: Plane, title: t('airport.title'), text: t('airport.text') },
    { icon: Route, title: t('beyond.title'), text: t('beyond.text') },
  ];

  return (
    <main>
      <PageHero
        eyebrow={t('eyebrow')}
        title={t('title')}
        text={t('text')}
        image="/images/site/gallery-4.jpg"
        crumbs={[{ href: '/', label: common('home') }, { label: t('eyebrow') }]}
      >
        <GoldLink href="/book">{common('getPrice')}</GoldLink>
      </PageHero>
      <Section>
        <ul className="grid gap-6 md:grid-cols-3">
          {cards.map(({ icon: Icon, title, text }) => (
            <li key={title} className="rounded-card border border-border bg-site-card p-6">
              <Icon size={24} aria-hidden className="text-site-gold-text" />
              <h2 className="mt-4 font-display text-xl text-text">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-text-muted">{text}</p>
            </li>
          ))}
        </ul>
        <p className="mt-8 max-w-3xl text-sm text-text-muted">{t('more')}</p>
      </Section>
      <CtaBand />
    </main>
  );
}
