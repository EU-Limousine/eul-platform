'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { LOCALE_NAMES, LOCALES, type Locale } from '@eul/i18n';
import { usePathname, useRouter } from '@/i18n/navigation';

/**
 * Visible on every page. Switching keeps the user on the same page and booking step
 * (query string kept) and next-intl saves the choice in the NEXT_LOCALE cookie.
 */
export function LanguageSwitcher() {
  const t = useTranslations('header');
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onChange(next: Locale) {
    const query = searchParams.toString();
    const href = query ? `${pathname}?${query}` : pathname;
    startTransition(() => router.replace(href, { locale: next }));
  }

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="sr-only">{t('language')}</span>
      <select
        value={locale}
        disabled={isPending}
        onChange={(e) => onChange(e.target.value as Locale)}
        className="rounded-control border border-site-line-dark bg-transparent px-2 py-1.5 text-sm text-site-on-dark"
      >
        {LOCALES.map((l) => (
          <option key={l} value={l} className="text-text">
            {LOCALE_NAMES[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
