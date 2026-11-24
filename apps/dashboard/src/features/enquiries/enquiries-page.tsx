import { useCallback, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import type { EnquiryDto, EnquiryType } from '@eul/api-client';
import { formatDateTime } from '@/shared/lib/format';
import { Card } from '@/shared/ui/card';
import { inputClass } from '@/shared/ui/form';
import { PageTitle } from '@/shared/ui/page-title';
import { Pagination } from '@/shared/ui/pagination';
import { SearchInput } from '@/shared/ui/search-input';
import { EmptyState, ErrorState, SkeletonRows } from '@/shared/ui/states';
import { useEnquiries } from './api';
import { ENQUIRY_TABS, ENQUIRY_TYPES, statusForTab, type EnquiriesSearch } from './enquiries-search';
import { EnquiryDialog } from './enquiry-dialog';
import { EnquiryStatusBadge } from './enquiry-status-badge';

const PAGE_SIZE = 25;

/** Messages from the website's contact, business and event forms. */
export function EnquiriesPage({ search }: { search: EnquiriesSearch }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const tab = search.tab ?? 'new';
  const enquiries = useEnquiries({
    status: statusForTab(tab),
    type: search.type,
    search: search.q,
    page: search.page ?? 1,
    pageSize: PAGE_SIZE,
  });
  const [open, setOpen] = useState<EnquiryDto | undefined>();

  const update = useCallback(
    (next: EnquiriesSearch) =>
      void navigate({
        to: '/enquiries',
        search: (prev: EnquiriesSearch) => {
          const merged = { ...prev, ...next };
          // Defaults (tab "new", page 1) are dropped so the URL stays clean.
          return { ...merged, tab: merged.tab === 'new' ? undefined : merged.tab, page: merged.page === 1 ? undefined : merged.page };
        },
      }),
    [navigate],
  );

  const newCount = enquiries.data?.newCount;

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <PageTitle>{t('enquiries.title')}</PageTitle>
          <p className="mt-1 text-sm text-text-muted">{t('enquiries.intro')}</p>
        </div>
        {newCount !== undefined && (
          <p className="text-sm text-text-muted tabular-nums" aria-live="polite">
            {t('enquiries.newCount', { count: newCount })}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label={t('enquiries.filters.status')} className="flex flex-wrap gap-1">
          {ENQUIRY_TABS.map((key) => (
            <button
              key={key}
              role="tab"
              type="button"
              aria-selected={tab === key}
              onClick={() => update({ tab: key, page: 1 })}
              className={`rounded-control px-3 py-1.5 text-sm ${
                tab === key ? 'bg-primary text-primary-foreground' : 'text-text-muted hover:bg-surface hover:text-text'
              }`}
            >
              {t(`enquiries.tabs.${key}`)}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm text-text-muted">
          {t('enquiries.filters.type')}
          <select
            value={search.type ?? ''}
            onChange={(e) => update({ type: (e.target.value || undefined) as EnquiryType | undefined, page: 1 })}
            className={`${inputClass} w-auto`}
          >
            <option value="">{t('enquiries.allTypes')}</option>
            {ENQUIRY_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(`enquiries.types.${type}`)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <Card
        actions={
          <SearchInput
            value={search.q}
            onChange={(q) => update({ q, page: 1 })}
            label={t('enquiries.search')}
            placeholder={t('enquiries.searchPlaceholder')}
          />
        }
      >
        {enquiries.isPending ? (
          <SkeletonRows />
        ) : enquiries.isError ? (
          <ErrorState error={enquiries.error} onRetry={() => void enquiries.refetch()} />
        ) : enquiries.data.items.length === 0 ? (
          <EmptyState message={search.q || search.type ? t('enquiries.emptyFiltered') : t(`enquiries.empty.${tab}`)} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-text-muted">
                  <tr className="border-b border-border">
                    <th className="py-2 pr-4 font-medium">{t('enquiries.fields.received')}</th>
                    <th className="py-2 pr-4 font-medium">{t('enquiries.fields.from')}</th>
                    <th className="py-2 pr-4 font-medium">{t('enquiries.fields.type')}</th>
                    <th className="py-2 pr-4 font-medium">{t('enquiries.fields.message')}</th>
                    <th className="py-2 font-medium">{t('enquiries.fields.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {enquiries.data.items.map((e) => (
                    <tr key={e.id} className="border-b border-border last:border-0 hover:bg-canvas/60">
                      <td className="py-2.5 pr-4 whitespace-nowrap tabular-nums">{formatDateTime(e.createdAt)}</td>
                      <td className="py-2.5 pr-4">
                        <button
                          type="button"
                          onClick={() => setOpen(e)}
                          className="text-left font-medium underline-offset-2 hover:underline"
                          aria-label={t('enquiries.open', { name: e.name })}
                        >
                          {e.name}
                        </button>
                        <div className="text-xs text-text-muted">{e.company ?? e.email}</div>
                      </td>
                      <td className="py-2.5 pr-4 whitespace-nowrap">{t(`enquiries.types.${e.type}`)}</td>
                      <td className="max-w-[28rem] py-2.5 pr-4">
                        <p className="truncate text-text-muted">{e.message}</p>
                      </td>
                      <td className="py-2.5">
                        <EnquiryStatusBadge status={e.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={enquiries.data.page}
              pageSize={enquiries.data.pageSize}
              total={enquiries.data.total}
              onPage={(page) => update({ page })}
            />
          </>
        )}
      </Card>

      <EnquiryDialog enquiry={open} onOpenChange={(isOpen) => !isOpen && setOpen(undefined)} onSaved={setOpen} />
    </section>
  );
}
