'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Container, OutlineLink } from '@/components/ui';

/** Unexpected error on a page (500). No technical details are shown to the visitor. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations('pages.errors');
  useEffect(() => {
    // Reported to Sentry once it is added; the digest links to the server log.
    console.error(error.digest ?? 'page error');
  }, [error]);
  return (
    <main className="bg-site-dark text-site-on-dark">
      <Container className="py-24 text-center">
        <h1 className="font-display text-4xl">{t('errorTitle')}</h1>
        <p className="mx-auto mt-4 max-w-md text-site-on-dark-muted">{t('errorText')}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reset} className="rounded-control bg-site-gold px-6 py-3 text-sm font-semibold text-site-dark">
            {t('retry')}
          </button>
          <OutlineLink href="/">{t('home')}</OutlineLink>
        </div>
      </Container>
    </main>
  );
}
