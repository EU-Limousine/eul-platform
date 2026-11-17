/** Week-over-week change. null when there is nothing to compare with (avoids "+∞%"). */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/** Short weekday for a Copenhagen YYYY-MM-DD date, e.g. "Mon". */
export function weekdayLabel(date: string, locale = 'en-GB'): string {
  // Noon UTC keeps the same calendar day in Copenhagen all year.
  return new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
}

/** Relative time like "5 min ago" from an ISO timestamp. */
export function timeAgo(iso: string, now: Date = new Date(), locale = 'en'): string {
  const seconds = Math.round((new Date(iso).getTime() - now.getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const abs = Math.abs(seconds);
  if (abs < 60) return rtf.format(seconds, 'second');
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), 'minute');
  if (abs < 86_400) return rtf.format(Math.round(seconds / 3600), 'hour');
  return rtf.format(Math.round(seconds / 86_400), 'day');
}
