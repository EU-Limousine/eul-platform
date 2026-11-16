import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { LegalDocument } from '@/components/legal-document';
import { LEGAL_PAGES, isLegalPage } from '@/components/legal-pages';
import { routing } from '@/i18n/routing';

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => LEGAL_PAGES.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLegalPage(slug)) return {};
  const t = await getTranslations({ locale, namespace: 'legal' });
  // Drafts stay out of search engines. TODO(go-live): remove `robots` once the texts are final.
  return { title: t(`titles.${slug}`), robots: { index: false, follow: true } };
}

export default async function LegalPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  if (!isLegalPage(slug)) notFound();
  setRequestLocale(locale);
  return <LegalDocument slug={slug} />;
}
