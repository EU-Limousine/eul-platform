import Image from 'next/image';
import { Briefcase } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CtaBand, PageHero, Section } from '@/components/page/blocks';
import { SERVICE_PAGES } from '@/components/page/services-data';
import { ArrowLink } from '@/components/ui';
import { pageMetadata } from '@/lib/page-metadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'pages.services' });
  return pageMetadata({ locale, path: '/services', title: t('metaTitle'), description: t('metaDescription') });
}

/** Services hub: one card per service page, plus Business travel. */
export default async function ServicesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('pages.services');
  const common = await getTranslations('pages.common');

  return (
    <main>
      <PageHero
        eyebrow={t('eyebrow')}
        title={t('title')}
        text={t('text')}
        image="/images/site/hero-classic.jpg"
        crumbs={[{ href: '/', label: common('home') }, { label: t('eyebrow') }]}
      />
      <Section>
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICE_PAGES.map((s) => {
            const Icon = s.icon;
            return (
              <li key={s.slug} className="flex flex-col overflow-hidden rounded-card border border-border bg-site-card">
                {s.image && (
                  <div className="relative aspect-[16/9]">
                    <Image src={s.image} alt="" fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover" />
                  </div>
                )}
                <div className="flex flex-1 flex-col p-5">
                  <h2 className="flex items-center gap-2 font-display text-xl text-text">
                    <Icon size={20} strokeWidth={1.6} aria-hidden className="text-site-gold-text" />
                    {t(`items.${s.key}.title`)}
                  </h2>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-text-muted">{t(`items.${s.key}.short`)}</p>
                  <div className="mt-4">
                    <ArrowLink href={`/services/${s.slug}`}>{common('learnMore')}</ArrowLink>
                  </div>
                </div>
              </li>
            );
          })}
          <li className="flex flex-col rounded-card border border-border bg-site-dark p-5 text-site-on-dark">
            <h2 className="flex items-center gap-2 font-display text-xl">
              <Briefcase size={20} strokeWidth={1.6} aria-hidden className="text-site-gold" />
              {t('business.title')}
            </h2>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-site-on-dark-muted">{t('business.text')}</p>
            <div className="mt-4">
              <ArrowLink href="/business" tone="dark">{common('learnMore')}</ArrowLink>
            </div>
          </li>
        </ul>
      </Section>
      <CtaBand />
    </main>
  );
}
