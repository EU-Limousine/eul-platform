'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { BookingApiError, getQuote } from './api';
import { CURRENCIES, defaultCurrency, type BookingDraft, type Place } from './draft';
import { copenhagenToUtcIso, copenhagenToday } from './format';
import { PlaceInput } from './place-input';
import { Alert, Field, PrimaryButton, fieldClass } from './ui';

type Errors = Partial<Record<'pickup' | 'dropoff' | 'date' | 'time' | 'passengers', string>>;

/** Step 1: where, when, how many. Gets prices for every vehicle class that fits. */
export function StepJourney({ draft, update, next }: { draft: BookingDraft; update: (p: Partial<BookingDraft>) => void; next: () => void }) {
  const t = useTranslations('booking.journey');
  const locale = useLocale();
  const currency = draft.currency ?? defaultCurrency(locale);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function validate(): Errors {
    const e: Errors = {};
    if (!draft.pickup) e.pickup = t('errors.pickup');
    if (!draft.dropoff) e.dropoff = t('errors.dropoff');
    if (draft.pickup && draft.dropoff && draft.pickup.placeId === draft.dropoff.placeId) e.dropoff = t('errors.same');
    if (!draft.date) e.date = t('errors.date');
    if (!draft.time) e.time = t('errors.time');
    if (!(draft.passengers >= 1 && draft.passengers <= 60)) e.passengers = t('errors.passengers');
    return e;
  }

  async function submit() {
    const e = validate();
    setErrors(e);
    setFormError(null);
    if (Object.keys(e).length || !draft.pickup || !draft.dropoff || !draft.date || !draft.time) return;

    setLoading(true);
    try {
      const pickupAt = copenhagenToUtcIso(draft.date, draft.time);
      const toPlace = (p: Place) => ({ address: p.address, lat: p.lat, lng: p.lng });
      const quote = await getQuote({ pickup: toPlace(draft.pickup), dropoff: toPlace(draft.dropoff), pickupAt, passengers: draft.passengers, currency });
      if (quote.options.length === 0) {
        setFormError(t('errors.noVehicles'));
        return;
      }
      update({
        currency,
        quote: { pickupAt, distanceMeters: quote.distanceMeters, durationSeconds: quote.durationSeconds, options: quote.options },
        quoteId: undefined,
        checkout: undefined,
      });
      next();
    } catch (error) {
      if (error instanceof BookingApiError && error.fieldErrors?.pickupAt) setErrors({ time: error.fieldErrors.pickupAt[0] });
      else setFormError(error instanceof BookingApiError ? error.message : t('errors.generic'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      className="space-y-5"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <h2 className="text-2xl font-semibold text-text">{t('title')}</h2>
      {formError && <Alert>{formError}</Alert>}

      <PlaceInput id="pickup" label={t('pickup')} value={draft.pickup} onChange={(pickup) => update({ pickup })} error={errors.pickup} />
      <PlaceInput id="dropoff" label={t('dropoff')} value={draft.dropoff} onChange={(dropoff) => update({ dropoff })} error={errors.dropoff} />

      <div className="grid grid-cols-2 gap-4">
        <Field id="date" label={t('date')} error={errors.date}>
          <input id="date" type="date" min={copenhagenToday()} value={draft.date ?? ''} aria-invalid={!!errors.date} onChange={(e) => update({ date: e.target.value })} className={fieldClass} />
        </Field>
        <Field id="time" label={t('time')} error={errors.time} hint={t('timeHint')}>
          <input id="time" type="time" step={300} value={draft.time ?? ''} aria-invalid={!!errors.time} onChange={(e) => update({ time: e.target.value })} className={fieldClass} />
        </Field>
      </div>

      <Field id="passengers" label={t('passengers')} error={errors.passengers}>
        <input
          id="passengers"
          type="number"
          inputMode="numeric"
          min={1}
          max={60}
          value={draft.passengers}
          aria-invalid={!!errors.passengers}
          onChange={(e) => update({ passengers: Number(e.target.value) })}
          className={`${fieldClass} max-w-[120px]`}
        />
      </Field>

      <fieldset>
        <legend className="mb-1.5 block text-sm font-medium text-text">{t('currency')}</legend>
        <div className="inline-flex rounded-control border border-border p-1">
          {CURRENCIES.map((c) => (
            <label key={c} className={`cursor-pointer rounded-control px-4 py-2 text-sm ${currency === c ? 'bg-brand-black text-on-dark' : 'text-text'}`}>
              <input type="radio" name="currency" value={c} className="sr-only" checked={currency === c} onChange={() => update({ currency: c, quote: undefined, quoteId: undefined })} />
              {c}
            </label>
          ))}
        </div>
      </fieldset>

      <PrimaryButton type="submit" disabled={loading}>
        {loading ? t('loading') : t('submit')}
      </PrimaryButton>
    </form>
  );
}
