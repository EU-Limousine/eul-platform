'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { CheckoutStatusDto } from '@eul/api-client';
import { Link } from '@/i18n/navigation';
import { checkoutStatus } from './api';
import { clearDraft, forgetCheckout } from './draft';
import { formatPickup, formatPrice } from './format';

const POLL_MS = 2_000;
const GIVE_UP_MS = 60_000;

type View = 'loading' | 'success' | 'failed' | 'pending' | 'error';

/**
 * Step 5. The payment provider sends the customer here. We poll the API until the
 * webhook has created the booking. Wording: "received / payment successful" — never
 * "confirmed" (that email comes once a chauffeur is assigned, §4.6).
 */
export function BookingConfirmation() {
  const t = useTranslations('booking.confirmation');
  const locale = useLocale();
  const checkoutId = useSearchParams().get('checkout');
  const [status, setStatus] = useState<CheckoutStatusDto | null>(null);
  const [view, setView] = useState<View>(checkoutId ? 'loading' : 'error');

  useEffect(() => {
    if (!checkoutId) return;
    let stopped = false;
    const started = Date.now();

    async function poll() {
      if (stopped || !checkoutId) return;
      try {
        const s = await checkoutStatus(checkoutId);
        if (stopped) return;
        setStatus(s);
        if (s.bookingReference) {
          setView('success');
          clearDraft();
          return;
        }
        if (s.status === 'FAILED' || s.status === 'EXPIRED') {
          forgetCheckout();
          setView('failed');
          return;
        }
      } catch {
        // keep trying until GIVE_UP_MS
      }
      if (Date.now() - started > GIVE_UP_MS) setView('pending');
      else window.setTimeout(() => void poll(), POLL_MS);
    }
    void poll();
    return () => {
      stopped = true;
    };
  }, [checkoutId]);

  return (
    <div className="mx-auto max-w-2xl px-5 py-12" aria-live="polite">
      {view === 'loading' && (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <Clock size={40} aria-hidden className="text-text-muted" />
          <h1 className="text-2xl font-semibold text-text">{t('checking')}</h1>
          <p className="text-text-muted">{t('checkingHint')}</p>
        </div>
      )}

      {view === 'success' && status && (
        <div className="space-y-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <CheckCircle2 size={48} aria-hidden className="text-success" />
            <h1 className="text-3xl font-semibold text-text">{t('title')}</h1>
            <p className="text-text-muted">{t('subtitle')}</p>
          </div>
          <dl className="divide-y divide-border rounded-card border border-border px-4">
            <Row label={t('reference')} value={status.bookingReference ?? ''} strong />
            <Row label={t('pickupTime')} value={formatPickup(status.pickupAt, locale)} />
            <Row label={t('from')} value={status.pickupAddress} />
            <Row label={t('to')} value={status.dropoffAddress} />
            <Row label={t('vehicle')} value={status.categoryName} />
            <Row label={t('paid')} value={formatPrice(status.amountMinor, status.currency, locale)} />
          </dl>
          <p className="rounded-control bg-canvas px-4 py-3 text-sm text-text">{t('nextSteps')}</p>
          <div className="text-center">
            <Link href="/" className="text-sm underline underline-offset-4">{t('home')}</Link>
          </div>
        </div>
      )}

      {view === 'failed' && (
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <XCircle size={44} aria-hidden className="text-danger" />
          <h1 className="text-2xl font-semibold text-text">{t('failedTitle')}</h1>
          <p className="text-text-muted">{t('failedHint')}</p>
          <Link href="/book?step=payment" className="rounded-control bg-brand-black px-5 py-3 text-on-dark">{t('tryAgain')}</Link>
        </div>
      )}

      {view === 'pending' && (
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <Clock size={44} aria-hidden className="text-warning" />
          <h1 className="text-2xl font-semibold text-text">{t('pendingTitle')}</h1>
          <p className="text-text-muted">{t('pendingHint')}</p>
        </div>
      )}

      {view === 'error' && (
        <div className="py-12 text-center">
          <h1 className="text-2xl font-semibold text-text">{t('notFound')}</h1>
          <Link href="/book" className="mt-4 inline-block underline underline-offset-4">{t('startBooking')}</Link>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="grid grid-cols-[130px_1fr] gap-3 py-2.5 text-sm">
      <dt className="text-text-muted">{label}</dt>
      <dd className={strong ? 'text-lg font-semibold tracking-wide text-text' : 'text-text'}>{value}</dd>
    </div>
  );
}
