import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { VehicleCard } from '@/components/home/fleet';
import { CheckList, CtaBand, FaqJsonLd, FaqList, PageHero, Section, Steps, type Faq } from '@/components/page/blocks';
import { EnquiryForm } from '@/components/page/enquiry-form';
import { SERVICE_PAGES, servicePage } from '@/components/page/services-data';
import { ArrowLink, Container, GoldLink } from '@/components/ui';
import { routing } from '@/i18n/routing';
import { pageMetadata } from '@/lib/page-metadata';
import { fetchPublicCategories } from '@/lib/public-api';

// Vehicle classes come from the API; refreshed every 5 minutes.
export const revalidate = 300;

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => SERVICE_PAGES.map((s) => ({ locale, slug: s.slug })));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const service = servicePage(slug);
  if (!service) return {};
  const t = await getTranslations({ locale, namespace: `pages.services.items.${service.key}` });
  return pageMetadata({ locale, path: `/services/${slug}`, title: t('metaTitle'), description: t('hero'), image: service.image });
}

/** One template for all seven service pages. Texts: messages → pages.services.items.<key>. */
export default async function ServicePage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const service = servicePage(slug);
  if (!service) notFound();
  setRequestLocale(locale);

  const t = await getTranslations(`pages.services.items.${service.key}`);
  const common = await getTranslations('pages.common');
  const services = await getTranslations('pages.services');
  const vehicles = (await fetchPublicCategories(locale)).filter((c) => service.vehicles.includes(c.code));

  const included = t.raw('included') as string[];
  const steps = t.raw('steps') as { title: string; text: string }[];
  const faqs = t.raw('faq') as Faq[];
  const related = SERVICE_PAGES.filter((s) => s.slug !== slug).slice(0, 3);
  const online = service.booking !== 'enquiry';
  const enquiry = service.booking !== 'online';

  return (
    <main>
      <PageHero
        eyebrow={services('eyebrow')}
        title={t('title')}
        text={t('hero')}
        image={service.image}
        crumbs={[{ href: '/', label: common('home') }, { href: '/services', label: services('eyebrow') }, { label: t('title') }]}
      >
        {online && (
          <GoldLink href="/book">
            {common('getPrice')} <ArrowRight size={16} aria-hidden />
          </GoldLink>
        )}
        {enquiry && (
          <a href="#enquiry" className="inline-flex items-center rounded-control border border-site-on-dark/60 px-6 py-3 text-sm font-semibold text-site-on-dark hover:bg-site-on-dark/10">
            {common('sendEnquiry')}
          </a>
        )}
      </PageHero>

      <Section title={t('introTitle')} intro={t('intro')}>
        <CheckList items={included} />
      </Section>

      <Section title={common('howItWorks')} tone="warm">
        <Steps items={steps} />
      </Section>

      {vehicles.length > 0 && (
        <Section title={common('suitableVehicles')} intro={common('vehicleNote')}>
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {vehicles.map((c) => (
              <VehicleCard key={c.id} category={c} locale={locale} />
            ))}
          </ul>
        </Section>
      )}

      <Section title={common('pricingTitle')} tone="warm">
        <p className="max-w-3xl text-text-muted">{online ? common('pricingOnline') : common('pricingEnquiry')}</p>
      </Section>

      {enquiry && (
        <Section id="enquiry" title={t('enquiryTitle')} intro={t('enquiryText')}>
          <div className="max-w-3xl">
            <EnquiryForm type={service.key === 'events' || service.key === 'group' ? 'EVENT' : 'GENERAL'} topic={service.slug} />
          </div>
        </Section>
      )}

      <Section title={common('faqTitle')} tone={enquiry ? 'warm' : 'surface'}>
        <div className="max-w-3xl">
          <FaqList items={faqs} />
        </div>
        <FaqJsonLd items={faqs} />
      </Section>

      <section className="bg-site-surface pb-16">
        <Container>
          <h2 className="font-display text-2xl text-text">{common('related')}</h2>
          <ul className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
            {related.map((s) => (
              <li key={s.slug}>
                <ArrowLink href={`/services/${s.slug}`}>{services(`items.${s.key}.title`)}</ArrowLink>
              </li>
            ))}
          </ul>
        </Container>
      </section>
      <CtaBand />
    </main>
  );
}
