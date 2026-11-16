import { fromZonedTime } from 'date-fns-tz';
import { TIME_ZONE } from '@eul/i18n';

const localeTag = (locale: string) => (locale === 'en' ? 'en-GB' : locale);

/** Copenhagen wall-clock date + time chosen by the customer → UTC ISO for the API. */
export function copenhagenToUtcIso(date: string, time: string): string {
  return fromZonedTime(`${date}T${time}:00`, TIME_ZONE).toISOString();
}

/** Today in Copenhagen as YYYY-MM-DD (min for the date picker). */
export function copenhagenToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

export function formatPickup(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(localeTag(locale), {
    timeZone: TIME_ZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(iso));
}

export function formatPrice(amountMinor: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(localeTag(locale), { style: 'currency', currency }).format(amountMinor / 100);
}

export function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}
