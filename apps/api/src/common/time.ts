/** Business time zone. Store UTC, display in this zone; abbreviations come from Intl. */
export const TIME_ZONE = 'Europe/Copenhagen';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// en-CA formats dates as YYYY-MM-DD.
const localDateFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** The calendar date in Copenhagen for an instant, as "YYYY-MM-DD". */
export function copenhagenDate(instant: Date): string {
  return localDateFormat.format(instant);
}

/** "YYYY-MM-DD" → Date for a Postgres DATE column (midnight UTC, no time-zone shift). */
export function dateOnly(isoDate: string): Date {
  if (!DATE_RE.test(isoDate)) throw new RangeError('Date must be YYYY-MM-DD');
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== isoDate) {
    throw new RangeError('Invalid date');
  }
  return date;
}

/** DATE column value → "YYYY-MM-DD". */
export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
