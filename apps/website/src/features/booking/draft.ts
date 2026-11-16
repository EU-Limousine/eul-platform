'use client';

import { useCallback, useEffect, useState } from 'react';
import type { QuoteOptionDto } from '@eul/api-client';

/**
 * The booking in progress, kept in this browser tab (sessionStorage) so it survives a
 * language switch or reload. Cleared after a successful booking. Never sent anywhere else.
 */
export interface Place {
  placeId: string;
  address: string;
  lat: number;
  lng: number;
}

export interface Details {
  name: string;
  email: string;
  phone: string;
  passengerName: string;
  passengerPhone: string;
  flightNumber: string;
  notes: string;
}

export interface BookingDraft {
  pickup?: Place;
  dropoff?: Place;
  date?: string; // YYYY-MM-DD, Copenhagen
  time?: string; // HH:mm, Copenhagen
  passengers: number;
  quote?: { pickupAt: string; distanceMeters: number; durationSeconds: number; options: QuoteOptionDto[] };
  quoteId?: string;
  details?: Details;
  /** One key per chosen quote: a double click or retry never pays twice. */
  checkout?: { quoteId: string; idempotencyKey: string };
}

const KEY = 'eul.booking.v1';
const EMPTY: BookingDraft = { passengers: 1 };

function read(): BookingDraft {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as BookingDraft) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

function write(draft: BookingDraft): void {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(draft));
  } catch {
    // Private mode / storage full: the flow still works within the page.
  }
}

export function clearDraft(): void {
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

/** After a failed payment: the next attempt must use a new idempotency key. */
export function forgetCheckout(): void {
  const draft = read();
  if (draft.checkout) write({ ...draft, checkout: undefined });
}

/** `draft` is null until loaded in the browser (avoids server/client mismatch). */
export function useBookingDraft() {
  const [draft, setDraft] = useState<BookingDraft | null>(null);

  useEffect(() => setDraft(read()), []);

  const update = useCallback((patch: Partial<BookingDraft>) => {
    setDraft((current) => {
      const next = { ...(current ?? read()), ...patch };
      write(next);
      return next;
    });
  }, []);

  return { draft, update };
}

export function newIdempotencyKey(): string {
  return `web-${crypto.randomUUID().replace(/-/g, '')}`;
}

export function selectedOption(draft: BookingDraft): QuoteOptionDto | undefined {
  return draft.quote?.options.find((o) => o.quoteId === draft.quoteId);
}
