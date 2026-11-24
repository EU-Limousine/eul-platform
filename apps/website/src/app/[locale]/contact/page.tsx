import type { Metadata } from 'next';
import { Mail, MapPin, Phone } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PageHero, Section } from '@/components/page/blocks';
import { EnquiryForm } from '@/components/page/enquiry-form';
import { ArrowLink } from '@/components/ui';
import { COMPANY } from '@/config/site';
import { pageMetadata } from '@/lib/page-metadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'pages.contact' });
  return pageMetadata({ locale, path: '/contact', title: t('metaTitle'), description: t('text') });
}

/** Contact details (only when filled in src/config/site.ts) + contact form → POST /public/enquiries. */
export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('pages.contact');
  const common = await getTranslations('pages.common');
  const hasDetails = COMPANY.phone || COMPANY.email || COMPANY.address;

  return (
    <main>
      <PageHero
        eyebrow={t('eyebrow')}
        title={t('title')}
        text={t('text')}
        crumbs={[{ href: '/', label: common('home') }, { label: t('eyebrow') }]}
      />
      <Section>
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div className="space-y-6">
            {hasDetails && (
              <ul className="space-y-4 rounded-card border border-border bg-site-card p-6 text-text">
                {COMPANY.phone && (
                  <li className="flex gap-3"><Phone size={18} aria-hidden className="mt-0.5 text-site-gold-text" /><a href={`tel:${COMPANY.phone.replace(/\s/g, '')}`} className="hover:underline">{COMPANY.phone}</a></li>
                )}
                {COMPANY.email && (
                  <li className="flex gap-3"><Mail size={18} aria-hidden className="mt-0.5 text-site-gold-text" /><a href={`mailto:${COMPANY.email}`} className="hover:underline">{COMPANY.email}</a></li>
                )}
                {COMPANY.address && (
                  <li className="flex gap-3"><MapPin size={18} aria-hidden className="mt-0.5 text-site-gold-text" /><span>{COMPANY.address}</span></li>
                )}
              </ul>
            )}
            <div className="rounded-card bg-site-dark p-6 text-site-on-dark">
              <h2 className="font-display text-xl">{t('priceTitle')}</h2>
              <p className="mt-2 text-sm text-site-on-dark-muted">{t('priceText')}</p>
              <div className="mt-4">
                <ArrowLink href="/book" tone="dark">{common('getPrice')}</ArrowLink>
              </div>
            </div>
            <div className="rounded-card border border-border bg-site-card p-6">
              <h2 className="font-display text-xl text-text">{t('faqTitle')}</h2>
              <p className="mt-2 text-sm text-text-muted">{t('faqText')}</p>
              <div className="mt-4">
                <ArrowLink href="/faq">{t('faqLink')}</ArrowLink>
              </div>
            </div>
          </div>
          <div>
            <h2 className="mb-4 font-display text-2xl text-text">{t('formTitle')}</h2>
            <EnquiryForm type="GENERAL" topic="contact" />
          </div>
        </div>
      </Section>
    </main>
  );
}
