import { useTranslation } from 'react-i18next';

export function Pagination({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (page: number) => void }) {
  const { t } = useTranslation();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;
  return (
    <nav aria-label={t('common.pagination')} className="flex items-center justify-between pt-4 text-sm">
      <span className="text-text-muted tabular-nums">{t('common.pageOf', { page, pages, total })}</span>
      <div className="flex gap-2">
        <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} className="rounded-control border border-border px-3 py-1.5 disabled:opacity-40">
          {t('common.previous')}
        </button>
        <button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)} className="rounded-control border border-border px-3 py-1.5 disabled:opacity-40">
          {t('common.next')}
        </button>
      </div>
    </nav>
  );
}
