'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Car, Clock, MapPin, Route, Users } from 'lucide-react';
import type { BookingDraft } from './draft';
import { formatDuration, formatPickup, formatPrice } from './format';
import type { PriceState } from './use-price';
import { Alert } from './ui';

/**
 * "Your trip and price": the price the API calculated from the map route, the vehicle class
 * and the passengers, with how it was built. Shown on the details step and above payment.
 */
export function PriceSummary({
  draft,
  price,
  onRetry,
  onChangeVehicle,
  onChangeJourney,
}: {
  draft: BookingDraft;
  price: PriceState;
  onRetry: () => void;
  onChangeVehicle: () => void;
  onChangeJourney: () => void;
}) {
  const t = useTranslations('booking.price');
  const locale = useLocale();
  const quote = draft.quote;
  if (!quote || !draft.pickup || !draft.dropoff) return null;

  const option = price.status === 'ready' ? price.option : undefined;
  const km = (quote.distanceMeters / 1000).toFixed(1);
  const money = (minor: number) => formatPrice(minor, option?.currency ?? 'EUR', locale);

  const line = (label: string, value: string) => (
    <div className="flex justify-between gap-4 py-1 text-sm">
      <dt className="text-text-muted">{label}</dt>
      <dd className="text-text tabular-nums">{value}</dd>
    </div>
  );

  return (
    <section aria-labelledby="price-title" aria-live="polite" className="rounded-card border border-border bg-surface p-5">
      <h3 id="price-title" className="text-lg font-semibold text-text">{t('title')}</h3>

      <ul className="mt-3 space-y-1.5 text-sm text-text">
        <li className="flex gap-2"><MapPin size={16} className="mt-0.5 shrink-0 text-text-muted" aria-hidden /> {draft.pickup.address} → {draft.dropoff.address}</li>
        <li className="flex gap-2"><Clock size={16} className="mt-0.5 shrink-0 text-text-muted" aria-hidden /> {formatPickup(quote.pickupAt, locale)}</li>
        <li className="flex gap-2">
          <Route size={16} className="mt-0.5 shrink-0 text-text-muted" aria-hidden />
          {t('route', { km, duration: formatDuration(quote.durationSeconds) })}
          {quote.distanceSource === 'estimate' && <span className="text-text-muted">({t('estimated')})</span>}
        </li>
        {option && <li className="flex gap-2"><Car size={16} className="mt-0.5 shrink-0 text-text-muted" aria-hidden /> {option.category.name}</li>}
        <li className="flex gap-2"><Users size={16} className="mt-0.5 shrink-0 text-text-muted" aria-hidden /> {t('passengers', { count: draft.passengers })}</li>
      </ul>
      <div className="mt-2 flex gap-4 text-xs">
        <button type="button" onClick={onChangeJourney} className="text-text-muted underline underline-offset-2 hover:text-text">{t('changeJourney')}</button>
        <button type="button" onClick={onChangeVehicle} className="text-text-muted underline underline-offset-2 hover:text-text">{t('changeVehicle')}</button>
      </div>

      <div className="mt-4 border-t border-border pt-3">
        {price.status === 'loading' && (
          <div aria-busy="true">
            <p className="text-sm text-text-muted">{t('calculating')}</p>
            <div className="mt-2 h-8 w-40 animate-pulse rounded-control bg-canvas" />
          </div>
        )}

        {price.status === 'unavailable' && (
          <Alert>
            <p>{t('unavailable')}</p>
            <button type="button" onClick={onChangeVehicle} className="mt-2 font-medium underline">{t('changeVehicle')}</button>
          </Alert>
        )}

        {price.status === 'error' && (
          <Alert>
            <p>{price.message || t('error')}</p>
            <button type="button" onClick={price.pickupTooSoon ? onChangeJourney : onRetry} className="mt-2 font-medium underline">
              {price.pickupTooSoon ? t('changeJourney') : t('retry')}
            </button>
          </Alert>
        )}

        {option && (
          <>
            <dl>
              {line(t('baseFare'), money(option.breakdown.baseFareMinor))}
              {option.breakdown.distanceMinor > 0 && line(t('distance', { km }), money(option.breakdown.distanceMinor))}
              {option.breakdown.timeMinor > 0 && line(t('time', { duration: formatDuration(quote.durationSeconds) }), money(option.breakdown.timeMinor))}
              {option.breakdown.minimumApplied && line(t('minimum'), money(option.breakdown.minimumFareMinor))}
            </dl>
            <div className="mt-2 flex items-baseline justify-between border-t border-border pt-3">
              <span className="font-medium text-text">{t('total')}</span>
              <span className="text-2xl font-semibold text-text tabular-nums">{formatPrice(option.amountMinor, option.currency, locale)}</span>
            </div>
            <p className="mt-2 text-xs text-text-muted">{t('fixedNote')}</p>
          </>
        )}
      </div>
    </section>
  );
}
