import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CheckList, CtaBand, FaqJsonLd, FaqList, PageHero, Section, Steps, type Faq } from '@/components/page/blocks';
import { EnquiryForm } from '@/components/page/enquiry-form';
import { pageMetadata } from '@/lib/page-metadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'pages.business' });
  return pageMetadata({ locale, path: '/business', title: t('metaTitle'), description: t('text'), image: '/images/site/service-corporate.jpg' });
}

/**
 * Business travel. Only what works today is promised (booking for guests, notes for the chauffeur,
 * email confirmations). Business accounts with invoicing are Phase 2C → described as "on request".
 */
export default async function BusinessPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('pages.business');
  const common = await getTranslations('pages.common');
  const faqs = t.raw('faq') as Faq[];

  return (
    <main>
      <PageHero
        eyebrow={t('eyebrow')}
        title={t('title')}
        text={t('text')}
        image="/images/site/service-corporate.jpg"
        crumbs={[{ href: '/', label: common('home') }, { label: t('eyebrow') }]}
      >
        <a href="#enquiry" className="inline-flex items-center rounded-control bg-site-gold px-6 py-3 text-sm font-semibold text-site-dark hover:brightness-105">
          {t('cta')}
        </a>
      </PageHero>

      <Section title={t('benefitsTitle')} intro={t('benefitsIntro')}>
        <CheckList items={t.raw('benefits') as string[]} />
      </Section>

      <Section title={t('useCasesTitle')} tone="warm">
        <Steps items={t.raw('useCases') as { title: string; text: string }[]} />
      </Section>

      <Section title={t('hotelsTitle')}>
        <p className="max-w-3xl text-text-muted">{t('hotelsText')}</p>
      </Section>

      <Section id="enquiry" title={t('formTitle')} intro={t('formText')} tone="warm">
        <div className="max-w-3xl">
          <EnquiryForm type="BUSINESS" topic="business" />
        </div>
      </Section>

      <Section title={common('faqTitle')}>
        <div className="max-w-3xl">
          <FaqList items={faqs} />
        </div>
        <FaqJsonLd items={faqs} />
      </Section>
      <CtaBand />
    </main>
  );
}
