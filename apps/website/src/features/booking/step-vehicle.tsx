'use client';

import { useTranslations } from 'next-intl';
import { Luggage, Users } from 'lucide-react';
import type { BookingDraft } from './draft';
import { formatDuration } from './format';
import { BackButton, PrimaryButton } from './ui';

/**
 * Step 2: choose a vehicle class. Only classes that fit the passengers are listed.
 * No prices here: the price is calculated from the route on the details step.
 */
export function StepVehicle({ draft, update, next, back }: { draft: BookingDraft; update: (p: Partial<BookingDraft>) => void; next: () => void; back: () => void }) {
  const t = useTranslations('booking.vehicle');
  const quote = draft.quote;
  if (!quote) return null;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold text-text">{t('title')}</h2>
        <p className="mt-1 text-sm text-text-muted">
          {t('trip', { km: (quote.distanceMeters / 1000).toFixed(1), duration: formatDuration(quote.durationSeconds) })}
          {' · '}
          {t('passengers', { count: draft.passengers })}
        </p>
      </div>

      <fieldset>
        <legend className="sr-only">{t('title')}</legend>
        <ul className="space-y-3">
          {quote.options.map((o) => {
            const checked = draft.categoryId === o.category.id;
            return (
              <li key={o.category.id}>
                <label
                  className={`flex cursor-pointer items-center gap-4 rounded-card border p-4 ${checked ? 'border-site-dark ring-1 ring-site-dark' : 'border-border hover:border-text-muted'}`}
                >
                  <input
                    type="radio"
                    name="vehicle"
                    className="sr-only"
                    checked={checked}
                    onChange={() => update({ categoryId: o.category.id, quoteId: o.quoteId, checkout: undefined })}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-text">{o.category.name}</span>
                    {o.category.exampleModel && (
                      <span className="block text-sm text-text-muted">{t('orSimilar', { model: o.category.exampleModel })}</span>
                    )}
                    {o.category.description && <span className="mt-1 block text-sm text-text-muted">{o.category.description}</span>}
                    <span className="mt-1 flex flex-wrap gap-4 text-xs text-text-muted">
                      <span className="inline-flex items-center gap-1"><Users size={14} aria-hidden /> {t('seats', { count: o.category.maxPassengers })}</span>
                      {o.category.luggageNote && <span className="inline-flex items-center gap-1"><Luggage size={14} aria-hidden /> {o.category.luggageNote}</span>}
                    </span>
                  </span>
                  <span
                    aria-hidden
                    className={`size-5 shrink-0 rounded-full border-2 ${checked ? 'border-site-dark bg-site-dark ring-2 ring-inset ring-surface' : 'border-border'}`}
                  />
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>

      <p className="text-xs text-text-muted">{t('priceNote')}</p>

      <div className="flex flex-col-reverse items-center gap-2 sm:flex-row sm:justify-between">
        <BackButton onClick={back}>{t('back')}</BackButton>
        <PrimaryButton onClick={next} disabled={!draft.categoryId}>{t('continue')}</PrimaryButton>
      </div>
    </div>
  );
}
