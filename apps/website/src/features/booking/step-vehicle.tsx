'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Luggage, Users } from 'lucide-react';
import type { BookingDraft } from './draft';
import { formatDuration, formatPrice } from './format';
import { BackButton, PrimaryButton } from './ui';

/** Step 2: choose a vehicle class. Prices come from the API quote; expired prices need a refresh. */
export function StepVehicle({ draft, update, next, back }: { draft: BookingDraft; update: (p: Partial<BookingDraft>) => void; next: () => void; back: () => void }) {
  const t = useTranslations('booking.vehicle');
  const locale = useLocale();
  const quote = draft.quote;
  if (!quote) return null;

  const expired = quote.options.every((o) => new Date(o.expiresAt) < new Date());

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold text-text">{t('title')}</h2>
        <p className="mt-1 text-sm text-text-muted">
          {t('trip', { km: (quote.distanceMeters / 1000).toFixed(1), duration: formatDuration(quote.durationSeconds) })}
        </p>
      </div>

      {expired ? (
        <div className="space-y-3 rounded-control border border-border p-4">
          <p className="text-sm text-text">{t('expired')}</p>
          <PrimaryButton onClick={back}>{t('refresh')}</PrimaryButton>
        </div>
      ) : (
        <fieldset>
          <legend className="sr-only">{t('title')}</legend>
          <ul className="space-y-3">
            {quote.options.map((o) => {
              const checked = draft.quoteId === o.quoteId;
              return (
                <li key={o.quoteId}>
                  <label
                    className={`flex cursor-pointer items-center gap-4 rounded-card border p-4 ${checked ? 'border-brand-black ring-1 ring-brand-black' : 'border-border hover:border-text-muted'}`}
                  >
                    <input
                      type="radio"
                      name="vehicle"
                      className="sr-only"
                      checked={checked}
                      onChange={() => update({ quoteId: o.quoteId, checkout: undefined })}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-text">{o.category.name}</span>
                      {o.category.exampleModel && (
                        <span className="block text-sm text-text-muted">{t('orSimilar', { model: o.category.exampleModel })}</span>
                      )}
                      <span className="mt-1 flex flex-wrap gap-4 text-xs text-text-muted">
                        <span className="inline-flex items-center gap-1"><Users size={14} aria-hidden /> {t('seats', { count: o.category.maxPassengers })}</span>
                        {o.category.luggageNote && <span className="inline-flex items-center gap-1"><Luggage size={14} aria-hidden /> {o.category.luggageNote}</span>}
                      </span>
                    </span>
                    <span className="text-lg font-semibold whitespace-nowrap text-text tabular-nums">{formatPrice(o.amountMinor, o.currency, locale)}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>
      )}

      <p className="text-xs text-text-muted">{t('priceNote')}</p>

      <div className="flex flex-col-reverse items-center gap-2 sm:flex-row sm:justify-between">
        <BackButton onClick={back}>{t('back')}</BackButton>
        <PrimaryButton onClick={next} disabled={!draft.quoteId || expired}>{t('continue')}</PrimaryButton>
      </div>
    </div>
  );
}
