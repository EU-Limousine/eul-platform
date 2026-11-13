import { useTranslations } from 'next-intl';
import { Suspense } from 'react';
import { Link } from '@/i18n/navigation';
import { LanguageSwitcher } from './language-switcher';

export function SiteHeader() {
  const t = useTranslations('header');
  return (
    <header className="bg-brand-black text-on-dark">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
        <Link href="/" className="font-display text-xl font-semibold">
          {t('brand')}
        </Link>
        {/* Suspense: the switcher reads the query string (useSearchParams) */}
        <Suspense fallback={null}>
          <LanguageSwitcher />
        </Suspense>
      </div>
    </header>
  );
}
