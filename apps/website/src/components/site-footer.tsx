import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { LEGAL_PAGES } from './legal-pages';

// TODO(content): replace the placeholder company line in messages ("footer.contact") before launch.
export function SiteFooter() {
  const t = useTranslations('footer');
  const legal = useTranslations('legal');
  return (
    <footer className="bg-brand-black text-on-dark-muted">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-10 text-sm md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <p className="font-display text-base text-on-dark">EU Limousine</p>
          <p>{t('contact')}</p>
          <p>{t('rights', { year: new Date().getFullYear() })}</p>
        </div>
        <nav aria-label={legal('nav')}>
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {LEGAL_PAGES.map((page) => (
              <li key={page}>
                <Link href={`/legal/${page}`} className="hover:text-on-dark">
                  {legal(`titles.${page}`)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
