import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CtaBand, PageHero, Section } from '@/components/page/blocks';
import { pageMetadata } from '@/lib/page-metadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'pages.blog' });
  // No articles yet → kept out of search results and the menu.
  // TODO(phase 1B): list posts from the content API once the dashboard blog editor exists; then remove noindex.
  return pageMetadata({ locale, path: '/blog', title: t('metaTitle'), description: t('text'), noindex: true });
}

/** Blog index. Empty until the content module (API + dashboard editor) is built. */
export default async function BlogPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('pages.blog');
  const common = await getTranslations('pages.common');
  return (
    <main>
      <PageHero eyebrow={t('eyebrow')} title={t('title')} text={t('text')} crumbs={[{ href: '/', label: common('home') }, { label: t('eyebrow') }]} />
      <Section>
        <p className="rounded-card border border-dashed border-border bg-site-card p-8 text-center text-text-muted">{t('empty')}</p>
      </Section>
      <CtaBand />
    </main>
  );
}
