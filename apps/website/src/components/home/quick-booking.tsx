'use client';

import { useState, type FormEvent } from 'react';
import { ArrowRight, CalendarDays, Clock, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { saveDraft, type Place } from '@/features/booking/draft';
import { copenhagenToday } from '@/features/booking/format';
import { PlaceInput } from '@/features/booking/place-input';
import { useRouter } from '@/i18n/navigation';

type Mode = 'oneWay' | 'hourly' | 'asDirected';

/**
 * The booking form in the hero. It uses the real address search, saves what the customer
 * entered and opens the booking flow, which asks the API for prices straight away.
 *  - variant "bar"  = Option 1 (one row under the hero)
 *  - variant "card" = Option 2 (card on the right of the hero)
 * Only one-way trips can be booked today; "hourly" and "as directed" stay hidden until
 * their pricing exists (D-06). Pass them in `modes` to show the tabs.
 */
export function QuickBooking({ variant, modes = ['oneWay'] }: { variant: 'bar' | 'card'; modes?: Mode[] }) {
  const t = useTranslations('home.quickBooking');
  const router = useRouter();
  const [pickup, setPickup] = useState<Place>();
  const [dropoff, setDropoff] = useState<Place>();
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [passengers, setPassengers] = useState(1);
  const [mode, setMode] = useState<Mode>('oneWay');
  const [error, setError] = useState<string | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!pickup || !dropoff) return setError(t('errors.addresses'));
    if (!date || !time) return setError(t('errors.when'));
    setError(null);
    saveDraft({ pickup, dropoff, date, time, passengers, quote: undefined, quoteId: undefined, checkout: undefined });
    router.push('/book?step=journey&auto=1');
  }

  const dark = 'w-full rounded-control border border-site-line-dark bg-site-dark-3 px-3 py-2.5 text-sm text-site-on-dark placeholder:text-site-on-dark-muted';
  const label = 'mb-1 block text-xs font-medium text-site-on-dark-muted';
  const card = variant === 'card';

  return (
    <form
      onSubmit={submit}
      noValidate
      aria-label={t('title')}
      className={
        card
          ? 'w-full rounded-card border border-site-line-dark bg-site-dark/95 p-6 shadow-2xl backdrop-blur'
          : 'w-full rounded-card border border-site-line-dark bg-site-dark p-5 shadow-2xl'
      }
    >
      {card && <h2 className="mb-4 font-display text-2xl text-site-on-dark">{t('title')}</h2>}

      {card && modes.length > 1 && (
        <div role="tablist" className="mb-4 grid grid-cols-3 rounded-control bg-site-dark-3 p-1 text-sm">
          {modes.map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={`rounded-control py-2 ${mode === m ? 'bg-site-dark text-site-gold' : 'text-site-on-dark-muted'}`}
            >
              {t(`modes.${m}`)}
            </button>
          ))}
        </div>
      )}

      <div className={card ? 'space-y-3' : 'grid gap-3 md:grid-cols-2 lg:grid-cols-[1.4fr_1.4fr_1fr_0.8fr_0.7fr_auto] lg:items-end'}>
        <PlaceInput id={`${variant}-pickup`} label={t('pickup')} value={pickup} onChange={setPickup} tone="dark" />
        <PlaceInput id={`${variant}-dropoff`} label={t('dropoff')} value={dropoff} onChange={setDropoff} tone="dark" />

        <div className={card ? 'grid grid-cols-2 gap-3' : 'contents'}>
          <div>
            <label htmlFor={`${variant}-date`} className={label}>
              <CalendarDays size={13} aria-hidden className="mr-1 inline text-site-gold" />
              {t('date')}
            </label>
            <input id={`${variant}-date`} type="date" min={copenhagenToday()} value={date} onChange={(e) => setDate(e.target.value)} className={dark} />
          </div>
          <div>
            <label htmlFor={`${variant}-time`} className={label}>
              <Clock size={13} aria-hidden className="mr-1 inline text-site-gold" />
              {t('time')}
            </label>
            <input id={`${variant}-time`} type="time" step={300} value={time} onChange={(e) => setTime(e.target.value)} className={dark} />
          </div>
        </div>

        <div>
          <label htmlFor={`${variant}-passengers`} className={label}>
            <Users size={13} aria-hidden className="mr-1 inline text-site-gold" />
            {t('passengers')}
          </label>
          <input
            id={`${variant}-passengers`}
            type="number"
            min={1}
            max={60}
            inputMode="numeric"
            value={passengers}
            onChange={(e) => setPassengers(Math.max(1, Number(e.target.value) || 1))}
            className={dark}
          />
        </div>

        <button
          type="submit"
          className={`inline-flex items-center justify-center gap-2 rounded-control bg-site-gold px-6 py-3 text-sm font-semibold text-site-dark hover:brightness-105 ${card ? 'mt-2 w-full' : 'w-full lg:w-auto'}`}
        >
          {card ? t('continue') : t('submit')} <ArrowRight size={16} aria-hidden />
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-site-gold">
          {error}
        </p>
      )}
      {card && <p className="mt-3 text-center text-xs text-site-on-dark-muted">{t('note')}</p>}
    </form>
  );
}
