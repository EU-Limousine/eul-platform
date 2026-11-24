'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

/** Same look for "Accept all" and "Reject all": refusing must be as easy as accepting. */
const choiceButton =
  'inline-flex min-h-11 items-center justify-center rounded-control bg-site-on-dark px-5 text-sm font-semibold text-site-dark transition hover:brightness-95';

/**
 * First layer: shown until the visitor decides. Not modal, so the site stays usable;
 * nothing optional loads while it is open.
 */
export function ConsentBanner({ onAcceptAll, onRejectAll, onChoose }: { onAcceptAll: () => void; onRejectAll: () => void; onChoose: () => void }) {
  const t = useTranslations('consent');
  return (
    <section
      aria-labelledby="consent-title"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-3xl rounded-card bg-site-dark p-5 text-site-on-dark shadow-2xl sm:inset-x-6 sm:p-6"
    >
      <h2 id="consent-title" className="font-display text-xl">
        {t('title')}
      </h2>
      <p className="mt-2 text-sm text-site-on-dark-muted">
        {t('text')}{' '}
        <Link href="/legal/cookies" className="font-semibold text-site-on-dark underline underline-offset-2">
          {t('policyLink')}
        </Link>
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <button type="button" onClick={onAcceptAll} className={choiceButton}>
          {t('acceptAll')}
        </button>
        <button type="button" onClick={onRejectAll} className={choiceButton}>
          {t('rejectAll')}
        </button>
        <button
          type="button"
          onClick={onChoose}
          className="min-h-11 px-3 text-sm font-semibold text-site-on-dark underline underline-offset-4 sm:ml-auto"
        >
          {t('choose')}
        </button>
      </div>
    </section>
  );
}
