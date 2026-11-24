import type { Metadata } from 'next';
import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CtaBand, PageHero, Section, Steps } from '@/components/page/blocks';
import { Container } from '@/components/ui';
import { COMPANY } from '@/config/site';
import { pageMetadata } from '@/lib/page-metadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'pages.about' });
  return pageMetadata({ locale, path: '/about', title: t('metaTitle'), description: t('text') });
}

/**
 * About. Only facts we have: the promise from the project brief, how booking works, where we drive.
 * Company story, chauffeur standards and company details are TODO(content) and stay hidden until supplied.
 */
export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('pages.about');
  const common = await getTranslations('pages.common');
  const facts = [
    { label: t('facts.name'), value: COMPANY.name },
    { label: t('facts.address'), value: COMPANY.address },
    { label: t('facts.phone'), value: COMPANY.phone },
    { label: t('facts.email'), value: COMPANY.email },
  ].filter((f) => f.value);

  return (
    <main>
      <PageHero
        eyebrow={t('eyebrow')}
        title={t('title')}
        text={t('text')}
        image="/images/site/about-noir.jpg"
        crumbs={[{ href: '/', label: common('home') }, { label: t('eyebrow') }]}
      />

      <section className="bg-site-surface py-16">
        <Container className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl text-text">{t('promiseTitle')}</h2>
            <p className="mt-4 leading-relaxed text-text-muted">{t('promiseText')}</p>
            <p className="mt-4 leading-relaxed text-text-muted">{t('whereText')}</p>
          </div>
          <div className="relative aspect-[3/2] overflow-hidden rounded-card">
            <Image src="/images/site/about-classic.jpg" alt="" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
          </div>
        </Container>
      </section>

      <Section title={t('howTitle')} tone="warm">
        <Steps items={t.raw('how') as { title: string; text: string }[]} />
      </Section>

      {facts.length > 1 && (
        <Section title={t('factsTitle')}>
          <dl className="grid max-w-3xl gap-x-8 gap-y-3 sm:grid-cols-[180px_1fr]">
            {facts.map((f) => (
              <div key={f.label} className="contents">
                <dt className="text-sm text-text-muted">{f.label}</dt>
                <dd className="text-text">{f.value}</dd>
              </div>
            ))}
          </dl>
        </Section>
      )}
      <CtaBand />
    </main>
  );
}
