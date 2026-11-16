import { fromZonedTime } from 'date-fns-tz';
import { TIME_ZONE } from '@eul/i18n';

/** All dates shown in Copenhagen time. Abbreviations (CET/CEST) come from Intl, never hard-coded. */
const dateTime = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});
const dateOnly = new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, weekday: 'short', day: '2-digit', month: 'short' });
const timeOnly = new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit' });
const isoDate = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' });

export const formatDateTime = (iso: string) => dateTime.format(new Date(iso));
export const formatDate = (iso: string) => dateOnly.format(new Date(iso));
export const formatTime = (iso: string) => timeOnly.format(new Date(iso));

/** Today's date in Copenhagen as YYYY-MM-DD (for date inputs). */
export const copenhagenToday = () => isoDate.format(new Date());

/** A Copenhagen calendar date (YYYY-MM-DD) → the UTC instant its day starts, as ISO. */
export function startOfCopenhagenDay(date: string): string {
  return fromZonedTime(`${date}T00:00:00`, TIME_ZONE).toISOString();
}

/** The day after a YYYY-MM-DD date, as YYYY-MM-DD (calendar maths, no time zone involved). */
export function nextDate(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** The day before a YYYY-MM-DD date. */
export function previousDate(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** "2026-11-20" → "Friday 20 November 2026" (a calendar date, no time zone shift). */
export function formatLongDate(date: string): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(
    new Date(`${date}T00:00:00Z`),
  );
}

/** Minor units →"€120.00" / "DKK 1,200.00". Display only; never do maths on the result. */
export function formatMoney(amountMinor: number, currency: string): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(amountMinor / 100);
}

export function formatDistance(meters: number): string {
  return `${(meters / 1000).toFixed(1)} km`;
}
