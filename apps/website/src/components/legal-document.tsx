import { AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { LEGAL_PAGES, type LegalPageSlug } from './legal-pages';

interface Section {
  h: string;
  p: string[];
}

/** Renders one legal page from the messages file. Plain text only (no HTML injection). */
export function LegalDocument({ slug }: { slug: LegalPageSlug }) {
  const t = useTranslations('legal');
  const sections = t.raw(`pages.${slug}.sections`) as Section[];

  return (
    <main className="bg-surface">
      <div className="mx-auto grid max-w-5xl gap-10 px-6 py-12 md:grid-cols-[200px_1fr]">
        <nav aria-label={t('nav')} className="text-sm">
          <ul className="space-y-2">
            {LEGAL_PAGES.map((page) => (
              <li key={page}>
                <Link
                  href={`/legal/${page}`}
                  aria-current={page === slug ? 'page' : undefined}
                  className={page === slug ? 'font-medium text-text' : 'text-text-muted hover:text-text'}
                >
                  {t(`titles.${page}`)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <article className="max-w-2xl">
          <p role="note" className="mb-6 flex gap-2 rounded-control border border-warning/50 bg-warning-bg px-4 py-3 text-sm text-text">
            <AlertTriangle size={18} aria-hidden className="mt-0.5 shrink-0 text-warning" />
            {t('draftBanner')}
          </p>
          <h1 className="text-3xl font-semibold text-text">{t(`titles.${slug}`)}</h1>
          <p className="mt-2 text-sm text-text-muted">{t('lastUpdated')}</p>
          <p className="mt-6 text-text">{t(`pages.${slug}.intro`)}</p>
          {sections.map((section) => (
            <section key={section.h} className="mt-8">
              <h2 className="text-xl font-semibold text-text">{section.h}</h2>
              {section.p.map((paragraph, i) => (
                <p key={i} className="mt-3 leading-relaxed text-text">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </article>
      </div>
    </main>
  );
}
