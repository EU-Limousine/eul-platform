import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CtaBand, FaqJsonLd, FaqList, PageHero, Section, type Faq } from '@/components/page/blocks';
import { pageMetadata } from '@/lib/page-metadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'pages.faq' });
  return pageMetadata({ locale, path: '/faq', title: t('metaTitle'), description: t('text') });
}

const GROUPS = ['booking', 'prices', 'airport', 'changes', 'business', 'vehicles'] as const;

/** Grouped questions. Policy answers point to the (draft) policies until D-07 is decided. */
export default async function FaqPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('pages.faq');
  const common = await getTranslations('pages.common');
  const groups = GROUPS.map((g) => ({ key: g, title: t(`groups.${g}.title`), items: t.raw(`groups.${g}.items`) as Faq[] }));

  return (
    <main>
      <PageHero
        eyebrow={t('eyebrow')}
        title={t('title')}
        text={t('text')}
        crumbs={[{ href: '/', label: common('home') }, { label: t('eyebrow') }]}
      />
      <Section>
        <div className="grid gap-10 lg:grid-cols-[220px_1fr]">
          <nav aria-label={t('jump')} className="hidden lg:block">
            <ul className="sticky top-28 space-y-2 text-sm">
              {groups.map((g) => (
                <li key={g.key}>
                  <a href={`#${g.key}`} className="text-text-muted hover:text-text">{g.title}</a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="space-y-10">
            {groups.map((g) => (
              <div key={g.key} id={g.key} className="scroll-mt-28">
                <h2 className="mb-4 font-display text-2xl text-text">{g.title}</h2>
                <FaqList items={g.items} />
              </div>
            ))}
          </div>
        </div>
        <FaqJsonLd items={groups.flatMap((g) => g.items)} />
      </Section>
      <CtaBand />
    </main>
  );
}
