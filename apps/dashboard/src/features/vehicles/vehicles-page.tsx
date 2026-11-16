import { useCallback, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { VehicleDto } from '@eul/api-client';
import { Can, useCan } from '@/features/auth/can';
import type { ListSearch } from '@/shared/lib/list-search';
import { Card } from '@/shared/ui/card';
import { PrimaryButton, YesNo } from '@/shared/ui/form';
import { PageTitle } from '@/shared/ui/page-title';
import { Pagination } from '@/shared/ui/pagination';
import { SearchInput } from '@/shared/ui/search-input';
import { EmptyState, ErrorState, SkeletonRows } from '@/shared/ui/states';
import { useCategories, useVehicles } from './api';
import { VehicleFormDialog } from './vehicle-form-dialog';

const PAGE_SIZE = 25;

export function VehiclesPage({ search }: { search: ListSearch }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const canWrite = useCan('vehicles.write');
  const categories = useCategories();
  const vehicles = useVehicles({ search: search.q, page: search.page ?? 1, pageSize: PAGE_SIZE });
  const [editing, setEditing] = useState<VehicleDto | undefined>();
  const [dialogOpen, setDialogOpen] = useState(false);

  const update = useCallback(
    (next: ListSearch) => void navigate({ to: '/vehicles', search: (prev: ListSearch) => ({ ...prev, ...next }) }),
    [navigate],
  );
  const openDialog = (vehicle?: VehicleDto) => {
    setEditing(vehicle);
    setDialogOpen(true);
  };

  return (
    <section className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <PageTitle>{t('vehicles.title')}</PageTitle>
        <Can permission="vehicles.write">
          <PrimaryButton onClick={() => openDialog()} disabled={!categories.data}>
            <Plus size={16} aria-hidden /> {t('vehicles.add')}
          </PrimaryButton>
        </Can>
      </div>

      <Card title={t('vehicles.categories')}>
        {categories.isPending ? (
          <SkeletonRows rows={3} />
        ) : categories.isError ? (
          <ErrorState error={categories.error} onRetry={() => void categories.refetch()} />
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-text-muted">
              <tr className="border-b border-border">
                <th className="py-2 pr-4 font-medium">{t('vehicles.fields.category')}</th>
                <th className="py-2 pr-4 font-medium">{t('vehicles.cols.example')}</th>
                <th className="py-2 pr-4 font-medium">{t('vehicles.cols.seats')}</th>
                <th className="py-2 pr-4 font-medium">{t('vehicles.cols.luggage')}</th>
                <th className="py-2 pr-4 font-medium">{t('vehicles.cols.vehicles')}</th>
                <th className="py-2 font-medium">{t('vehicles.cols.data')}</th>
              </tr>
            </thead>
            <tbody>
              {categories.data.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0">
                  <td className="py-2.5 pr-4 font-medium">{c.name}{!c.isActive && <span className="ml-2 text-xs text-text-muted">({t('common.inactive')})</span>}</td>
                  <td className="py-2.5 pr-4">{c.exampleModel ?? '—'}</td>
                  <td className="py-2.5 pr-4 tabular-nums">{c.maxPassengers}</td>
                  <td className="py-2.5 pr-4">{c.luggageNote ?? '—'}</td>
                  <td className="py-2.5 pr-4 tabular-nums">{c.vehicleCount}</td>
                  <td className="py-2.5"><YesNo value={c.isConfirmed} yes={t('common.confirmed')} no={t('common.unconfirmed')} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card title={t('vehicles.fleet')} actions={<SearchInput value={search.q} onChange={(q) => update({ q, page: undefined })} label={t('vehicles.search')} placeholder={t('vehicles.searchPlaceholder')} />}>
        {vehicles.isPending ? (
          <SkeletonRows />
        ) : vehicles.isError ? (
          <ErrorState error={vehicles.error} onRetry={() => void vehicles.refetch()} />
        ) : vehicles.data.items.length === 0 ? (
          <EmptyState message={t('vehicles.empty')} />
        ) : (
          <>
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-text-muted">
                <tr className="border-b border-border">
                  <th className="py-2 pr-4 font-medium">{t('vehicles.fields.plate')}</th>
                  <th className="py-2 pr-4 font-medium">{t('vehicles.cols.vehicle')}</th>
                  <th className="py-2 pr-4 font-medium">{t('vehicles.fields.category')}</th>
                  <th className="py-2 pr-4 font-medium">{t('vehicles.fields.color')}</th>
                  <th className="py-2 pr-4 font-medium">{t('vehicles.fields.active')}</th>
                  {canWrite && <th className="py-2" />}
                </tr>
              </thead>
              <tbody>
                {vehicles.data.items.map((v) => (
                  <tr key={v.id} className="border-b border-border last:border-0">
                    <td className="py-2.5 pr-4 font-medium tabular-nums">{v.plate}</td>
                    <td className="py-2.5 pr-4">{v.make} {v.model}</td>
                    <td className="py-2.5 pr-4">{v.categoryName}</td>
                    <td className="py-2.5 pr-4">{v.color ?? '—'}</td>
                    <td className="py-2.5 pr-4"><YesNo value={v.isActive} yes={t('common.active')} no={t('common.inactive')} /></td>
                    {canWrite && (
                      <td className="py-2.5 text-right">
                        <button type="button" onClick={() => openDialog(v)} className="text-sm underline-offset-2 hover:underline">
                          {t('common.edit')}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={vehicles.data.page} pageSize={vehicles.data.pageSize} total={vehicles.data.total} onPage={(page) => update({ page })} />
          </>
        )}
      </Card>

      {categories.data && (
        <VehicleFormDialog open={dialogOpen} onOpenChange={setDialogOpen} categories={categories.data} vehicle={editing} />
      )}
    </section>
  );
}
