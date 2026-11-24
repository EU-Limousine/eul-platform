'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import type { CreateQuoteDto, QuoteOptionDto } from '@eul/api-client';
import { BookingApiError, getQuote } from './api';
import { defaultCurrency, isFresh, selectedOption, type BookingDraft, type Place } from './draft';

/** The quote request for the journey in the draft. The API calculates the route and every price. */
export function quoteRequest(draft: BookingDraft, pickupAt: string, currency: string): CreateQuoteDto | null {
  if (!draft.pickup || !draft.dropoff) return null;
  const toPlace = (p: Place) => ({ address: p.address, lat: p.lat, lng: p.lng });
  return {
    pickup: toPlace(draft.pickup),
    dropoff: toPlace(draft.dropoff),
    pickupAt,
    passengers: draft.passengers,
    currency: currency as CreateQuoteDto['currency'],
  };
}

export type PriceState =
  | { status: 'loading' }
  | { status: 'ready'; option: QuoteOptionDto }
  /** The chosen class no longer fits or has no price → choose another vehicle. */
  | { status: 'unavailable' }
  | { status: 'error'; message: string; pickupTooSoon: boolean };

/**
 * The price for the chosen vehicle, calculated by the API from the map route, the vehicle class
 * and the passengers. `recalculate: 'always'` gets a fresh price on arrival (details step);
 * `'ifExpired'` only when the current one is about to expire (payment step).
 */
export function usePrice(
  draft: BookingDraft,
  update: (p: Partial<BookingDraft>) => void,
  recalculate: 'always' | 'ifExpired',
): { price: PriceState; retry: () => void } {
  const locale = useLocale();
  const current = selectedOption(draft);
  const needsQuote = recalculate === 'always' || !current || !isFresh(current);
  const [price, setPrice] = useState<PriceState>(
    !needsQuote && current ? { status: 'ready', option: current } : { status: 'loading' },
  );
  const started = useRef(false);
  // Always read the latest draft without re-creating `run` on every keystroke in the form.
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const run = useCallback(async () => {
    const draft = draftRef.current;
    const pickupAt = draft.quote?.pickupAt;
    const currency = draft.currency ?? defaultCurrency(locale);
    const body = pickupAt ? quoteRequest(draft, pickupAt, currency) : null;
    if (!body || !draft.categoryId) {
      setPrice({ status: 'unavailable' });
      return;
    }
    setPrice({ status: 'loading' });
    try {
      const quote = await getQuote(body);
      const option = quote.options.find((o) => o.category.id === draft.categoryId);
      update({
        quote: {
          pickupAt,
          distanceMeters: quote.distanceMeters,
          durationSeconds: quote.durationSeconds,
          distanceSource: quote.distanceSource,
          options: quote.options,
        },
        quoteId: option?.quoteId,
        checkout: undefined,
      });
      setPrice(option ? { status: 'ready', option } : { status: 'unavailable' });
    } catch (e) {
      const pickupTooSoon = e instanceof BookingApiError && !!e.fieldErrors?.pickupAt;
      setPrice({ status: 'error', message: e instanceof BookingApiError ? e.message : '', pickupTooSoon });
    }
  }, [locale, update]);

  useEffect(() => {
    if (started.current || !needsQuote) return;
    started.current = true;
    void run();
  }, [needsQuote, run]);

  return { price, retry: () => void run() };
}
