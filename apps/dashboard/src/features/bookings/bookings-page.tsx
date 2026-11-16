import { useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { nextDate, startOfCopenhagenDay } from '@/shared/lib/format';
import { Card } from '@/shared/ui/card';
import { PageTitle } from '@/shared/ui/page-title';
import { Pagination } from '@/shared/ui/pagination';
import { EmptyState, ErrorState, SkeletonRows } from '@/shared/ui/states';
import { useBookingList } from './api';
import { BookingsFilters } from './bookings-filters';
import type { BookingsSearch } from './bookings-search';
import { BookingsTable } from './bookings-table';
import { statusesFor } from './status-filters';

const PAGE_SIZE = 25;

/** Page = compose sections; data in hooks; filters in the URL. */
export function BookingsPage({ search }: { search: BookingsSearch }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data, isPending, isError, error, refetch, isFetching } = useBookingList({
    status: statusesFor(search.tab ?? 'all'),
    search: search.q,
    from: search.from ? startOfCopenhagenDay(search.from) : undefined,
    to: search.to ? startOfCopenhagenDay(nextDate(search.to)) : undefined,
    page: search.page ?? 1,
    pageSize: PAGE_SIZE,
    sort: 'pickupAt',
  });

  const update = useCallback(
    (next: Partial<BookingsSearch>) => {
      // Defaults (tab "all", page 1) are dropped so the URL stays clean.
      void navigate({
        to: '/bookings',
        search: (prev: BookingsSearch) => {
          const merged = { ...prev, ...next };
          return { ...merged, tab: merged.tab === 'all' ? undefined : merged.tab, page: merged.page === 1 ? undefined : merged.page };
        },
      });
    },
    [navigate],
  );

  return (
    <section className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <PageTitle>{t('bookings.title')}</PageTitle>
          <p className="mt-1 text-sm text-text-muted">{t('bookings.subtitle')}</p>
        </div>
        <span className="text-xs text-text-muted" aria-live="polite">
          {isFetching ? t('common.refreshing') : t('bookings.autoRefresh')}
        </span>
      </div>

      <BookingsFilters value={search} onChange={update} />

      <Card>
        {isPending ? (
          <SkeletonRows />
        ) : isError ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : data.items.length === 0 ? (
          <EmptyState message={t('bookings.empty')} />
        ) : (
          <>
            <BookingsTable items={data.items} />
            <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPage={(page) => update({ page })} />
          </>
        )}
      </Card>
    </section>
  );
}
