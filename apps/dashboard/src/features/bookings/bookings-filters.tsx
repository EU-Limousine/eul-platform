import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { STATUS_TABS, type StatusTabKey } from './status-filters';
import type { BookingsSearch } from './bookings-search';

interface Props {
  value: BookingsSearch;
  onChange: (next: Partial<BookingsSearch>) => void;
}

/** Status tabs, search and date range. Reports changes; the page writes them to the URL. */
export function BookingsFilters({ value, onChange }: Props) {
  const { t } = useTranslation();
  const [query, setQuery] = useState(value.q ?? '');

  // Search after the user stops typing for 300 ms.
  useEffect(() => {
    const id = window.setTimeout(() => {
      if ((value.q ?? '') !== query.trim()) onChange({ q: query.trim() || undefined, page: 1 });
    }, 300);
    return () => window.clearTimeout(id);
  }, [query, value.q, onChange]);

  return (
    <div className="space-y-3">
      <div role="tablist" aria-label={t('bookings.filters.status')} className="flex flex-wrap gap-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            type="button"
            aria-selected={(value.tab ?? 'all') === tab.key}
            onClick={() => onChange({ tab: tab.key as StatusTabKey, page: 1 })}
            className={`rounded-control px-3 py-1.5 text-sm ${
              (value.tab ?? 'all') === tab.key ? 'bg-navy-900 text-on-dark' : 'text-text-muted hover:bg-surface hover:text-text'
            }`}
          >
            {t(`bookings.tabs.${tab.key}`)}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="relative block min-w-[260px] flex-1">
          <span className="sr-only">{t('bookings.filters.search')}</span>
          <Search size={16} aria-hidden className="absolute top-1/2 left-3 -translate-y-1/2 text-text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('bookings.filters.searchPlaceholder')}
            className="w-full rounded-control border border-border bg-surface py-2 pr-3 pl-9 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-text-muted">{t('bookings.filters.from')}</span>
          <input
            type="date"
            value={value.from ?? ''}
            onChange={(e) => onChange({ from: e.target.value || undefined, page: 1 })}
            className="rounded-control border border-border bg-surface px-3 py-1.5"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-text-muted">{t('bookings.filters.to')}</span>
          <input
            type="date"
            value={value.to ?? ''}
            min={value.from}
            onChange={(e) => onChange({ to: e.target.value || undefined, page: 1 })}
            className="rounded-control border border-border bg-surface px-3 py-1.5"
          />
        </label>
      </div>
    </div>
  );
}
