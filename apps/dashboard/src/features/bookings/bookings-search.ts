import { isStatusTab, type StatusTabKey } from './status-filters';

/**
 * Filters, sort and page live in the URL (§5 Dashboard), so a view can be shared or reloaded.
 * Every key is optional so a plain link to /bookings works; defaults are applied in the page.
 */
export interface BookingsSearch {
  tab?: StatusTabKey;
  q?: string;
  from?: string; // YYYY-MM-DD, Copenhagen
  to?: string; // YYYY-MM-DD, Copenhagen, inclusive
  page?: number;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function validateBookingsSearch(raw: Record<string, unknown>): BookingsSearch {
  const page = Number(raw.page);
  return {
    tab: isStatusTab(raw.tab) && raw.tab !== 'all' ? raw.tab : undefined,
    q: typeof raw.q === 'string' && raw.q.trim() ? raw.q.trim().slice(0, 100) : undefined,
    from: typeof raw.from === 'string' && DATE.test(raw.from) ? raw.from : undefined,
    to: typeof raw.to === 'string' && DATE.test(raw.to) ? raw.to : undefined,
    page: Number.isInteger(page) && page > 1 ? page : undefined,
  };
}
