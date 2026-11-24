'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { BookingDraft, Details } from './draft';
import { PriceSummary } from './price-summary';
import { BackButton, Field, PrimaryButton, fieldClass } from './ui';
import { usePrice } from './use-price';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?[0-9 ()-]{6,20}$/;
const FLIGHT = /^[A-Z0-9]{2,3}[0-9]{1,4}[A-Z]?$/;

const EMPTY: Details = { name: '', email: '', phone: '', passengerName: '', passengerPhone: '', flightNumber: '', notes: '' };

/**
 * Step 3: your price + who books and who travels. On arrival the API recalculates the price from
 * the map route, the chosen vehicle class and the passengers. The API validates everything again.
 */
export function StepDetails({
  draft,
  update,
  next,
  back,
  toJourney,
}: {
  draft: BookingDraft;
  update: (p: Partial<BookingDraft>) => void;
  next: () => void;
  back: () => void;
  toJourney: () => void;
}) {
  const t = useTranslations('booking.details');
  const { price, retry } = usePrice(draft, update, 'always');
  const d = { ...EMPTY, ...draft.details };
  const [errors, setErrors] = useState<Partial<Record<keyof Details, string>>>({});
  const [someoneElse, setSomeoneElse] = useState(!!d.passengerName);

  const set = (patch: Partial<Details>) => update({ details: { ...d, ...patch }, checkout: undefined });

  function submit() {
    const e: Partial<Record<keyof Details, string>> = {};
    if (!d.name.trim()) e.name = t('errors.name');
    if (!EMAIL.test(d.email.trim())) e.email = t('errors.email');
    if (!PHONE.test(d.phone.trim())) e.phone = t('errors.phone');
    if (someoneElse && !d.passengerName.trim()) e.passengerName = t('errors.passengerName');
    if (someoneElse && d.passengerPhone.trim() && !PHONE.test(d.passengerPhone.trim())) e.passengerPhone = t('errors.phone');
    const flight = d.flightNumber.toUpperCase().replace(/\s+/g, '');
    if (flight && !FLIGHT.test(flight)) e.flightNumber = t('errors.flight');
    setErrors(e);
    if (Object.keys(e).length || price.status !== 'ready') return;
    if (!someoneElse) set({ passengerName: '', passengerPhone: '' });
    next();
  }

  const input = (key: keyof Details, type = 'text', autoComplete?: string) => (
    <input
      id={key}
      type={type}
      autoComplete={autoComplete}
      value={d[key]}
      aria-invalid={!!errors[key]}
      aria-describedby={errors[key] ? `${key}-error` : undefined}
      onChange={(e) => set({ [key]: e.target.value } as Partial<Details>)}
      className={fieldClass}
    />
  );

  return (
    <form
      className="space-y-5"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <PriceSummary draft={draft} price={price} onRetry={retry} onChangeVehicle={back} onChangeJourney={toJourney} />

      <h2 className="text-2xl font-semibold text-text">{t('title')}</h2>

      <Field id="name" label={t('name')} error={errors.name}>{input('name', 'text', 'name')}</Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="email" label={t('email')} error={errors.email} hint={t('emailHint')}>{input('email', 'email', 'email')}</Field>
        <Field id="phone" label={t('phone')} error={errors.phone}>{input('phone', 'tel', 'tel')}</Field>
      </div>

      <label className="flex items-center gap-2 text-sm text-text">
        <input type="checkbox" checked={someoneElse} onChange={(e) => setSomeoneElse(e.target.checked)} />
        {t('someoneElse')}
      </label>
      {someoneElse && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="passengerName" label={t('passengerName')} error={errors.passengerName}>{input('passengerName')}</Field>
          <Field id="passengerPhone" label={t('passengerPhone')} error={errors.passengerPhone}>{input('passengerPhone', 'tel')}</Field>
        </div>
      )}

      <Field id="flightNumber" label={t('flight')} error={errors.flightNumber} hint={t('flightHint')}>{input('flightNumber')}</Field>
      <Field id="notes" label={t('notes')} error={errors.notes}>
        <textarea id="notes" rows={3} maxLength={1000} value={d.notes} onChange={(e) => set({ notes: e.target.value })} className={fieldClass} />
      </Field>

      <div className="flex flex-col-reverse items-center gap-2 sm:flex-row sm:justify-between">
        <BackButton onClick={back}>{t('back')}</BackButton>
        <PrimaryButton type="submit" disabled={price.status !== 'ready'}>{t('continue')}</PrimaryButton>
      </div>
    </form>
  );
}
