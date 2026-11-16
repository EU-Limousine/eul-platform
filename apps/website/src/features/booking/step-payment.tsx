'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { isLocale } from '@eul/i18n';
import { Link } from '@/i18n/navigation';
import { BookingApiError, createCheckout } from './api';
import { newIdempotencyKey, selectedOption, type BookingDraft } from './draft';
import { formatPickup, formatPrice } from './format';
import { Alert, BackButton, PrimaryButton } from './ui';

/**
 * Step 4: summary and payment (§4.10). The customer is sent to the payment provider's page.
 * The booking is created by the API only after the provider confirms payment.
 */
export function StepPayment({ draft, update, back, restart }: { draft: BookingDraft; update: (p: Partial<BookingDraft>) => void; back: () => void; restart: () => void }) {
  const t = useTranslations('booking.payment');
  const locale = useLocale();
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<{ message: string; expired: boolean } | null>(null);
  const [paying, setPaying] = useState(false);

  const option = selectedOption(draft);
  const details = draft.details;
  if (!option || !details || !draft.quote || !draft.pickup || !draft.dropoff) return null;

  async function pay() {
    if (!option || !details) return;
    setError(null);
    setPaying(true);
    // Same key for retries of the same quote → never two payments for one booking attempt.
    const checkout = draft.checkout?.quoteId === option.quoteId ? draft.checkout : { quoteId: option.quoteId, idempotencyKey: newIdempotencyKey() };
    update({ checkout });
    try {
      const flight = details.flightNumber.toUpperCase().replace(/\s+/g, '');
      const result = await createCheckout(
        {
          quoteId: option.quoteId,
          customer: { name: details.name.trim(), email: details.email.trim(), phone: details.phone.trim() },
          passengerName: details.passengerName.trim() || undefined,
          passengerPhone: details.passengerPhone.trim() || undefined,
          flightNumber: flight || undefined,
          notes: details.notes.trim() || undefined,
          language: isLocale(locale) ? locale : 'en',
        },
        checkout.idempotencyKey,
      );
      if (!result.redirectUrl) throw new BookingApiError(500, 'NO_REDIRECT', t('errors.generic'));
      window.location.assign(result.redirectUrl);
    } catch (e) {
      setPaying(false);
      const expired = e instanceof BookingApiError && (e.code === 'QUOTE_EXPIRED' || e.code === 'QUOTE_ALREADY_BOOKED');
      setError({ message: e instanceof BookingApiError ? e.message : t('errors.generic'), expired });
    }
  }

  const row = (label: string, value: string) => (
    <div className="grid grid-cols-[120px_1fr] gap-3 py-2 text-sm">
      <dt className="text-text-muted">{label}</dt>
      <dd className="text-text">{value}</dd>
    </div>
  );

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-semibold text-text">{t('title')}</h2>

      <dl className="divide-y divide-border rounded-card border border-border px-4">
        {row(t('pickupTime'), formatPickup(draft.quote.pickupAt, locale))}
        {row(t('from'), draft.pickup.address)}
        {row(t('to'), draft.dropoff.address)}
        {row(t('vehicle'), option.category.name)}
        {row(t('passengers'), String(draft.passengers))}
        {row(t('name'), details.name)}
        {row(t('contact'), `${details.email} · ${details.phone}`)}
        {details.flightNumber && row(t('flight'), details.flightNumber.toUpperCase())}
        <div className="flex items-center justify-between py-3">
          <dt className="font-medium text-text">{t('total')}</dt>
          <dd className="text-xl font-semibold text-text tabular-nums">{formatPrice(option.amountMinor, option.currency, locale)}</dd>
        </div>
      </dl>

      <p className="text-sm text-text-muted">{t('howItWorks')}</p>

      <label className="flex items-start gap-2 text-sm text-text">
        <input type="checkbox" className="mt-0.5" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
        <span>
          {t.rich('accept', {
            terms: (chunks) => <Link href="/legal/terms" target="_blank" className="underline underline-offset-2">{chunks}</Link>,
            cancellation: (chunks) => <Link href="/legal/cancellation" target="_blank" className="underline underline-offset-2">{chunks}</Link>,
          })}
        </span>
      </label>

      {error && (
        <Alert>
          <p>{error.message}</p>
          {error.expired && (
            <button type="button" onClick={restart} className="mt-2 font-medium underline">
              {t('getNewPrice')}
            </button>
          )}
        </Alert>
      )}

      <div className="flex flex-col-reverse items-center gap-2 sm:flex-row sm:justify-between">
        <BackButton onClick={back} disabled={paying}>{t('back')}</BackButton>
        <PrimaryButton onClick={() => void pay()} disabled={!accepted || paying}>
          {paying ? t('redirecting') : t('pay', { amount: formatPrice(option.amountMinor, option.currency, locale) })}
        </PrimaryButton>
      </div>
    </div>
  );
}
