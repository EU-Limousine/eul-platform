import { useCallback, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { DriverDto } from '@eul/api-client';
import { useCan } from '@/features/auth/can';
import type { ListSearch } from '@/shared/lib/list-search';
import { Card } from '@/shared/ui/card';
import { PrimaryButton, YesNo } from '@/shared/ui/form';
import { PageTitle } from '@/shared/ui/page-title';
import { Pagination } from '@/shared/ui/pagination';
import { SearchInput } from '@/shared/ui/search-input';
import { EmptyState, ErrorState, SkeletonRows } from '@/shared/ui/states';
import { useDrivers } from './api';
import { DriverFormDialog } from './driver-form-dialog';

const PAGE_SIZE = 25;

export function DriversPage({ search }: { search: ListSearch }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const canWrite = useCan('drivers.write');
  // Adding a driver creates a login account, so it also needs users.write (as in the API).
  const canWriteUsers = useCan('users.write');
  const canCreate = canWrite && canWriteUsers;
  const drivers = useDrivers({ search: search.q, page: search.page ?? 1, pageSize: PAGE_SIZE });
  const [editing, setEditing] = useState<DriverDto | undefined>();
  const [dialogOpen, setDialogOpen] = useState(false);

  const update = useCallback(
    (next: ListSearch) => void navigate({ to: '/drivers', search: (prev: ListSearch) => ({ ...prev, ...next }) }),
    [navigate],
  );
  const openDialog = (driver?: DriverDto) => {
    setEditing(driver);
    setDialogOpen(true);
  };

  return (
    <section className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <PageTitle>{t('drivers.title')}</PageTitle>
        {canCreate && (
          <PrimaryButton onClick={() => openDialog()}>
            <Plus size={16} aria-hidden /> {t('drivers.add')}
          </PrimaryButton>
        )}
      </div>

      <Card actions={<SearchInput value={search.q} onChange={(q) => update({ q, page: undefined })} label={t('drivers.search')} placeholder={t('drivers.searchPlaceholder')} />}>
        {drivers.isPending ? (
          <SkeletonRows />
        ) : drivers.isError ? (
          <ErrorState error={drivers.error} onRetry={() => void drivers.refetch()} />
        ) : drivers.data.items.length === 0 ? (
          <EmptyState message={t('drivers.empty')} />
        ) : (
          <>
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-text-muted">
                <tr className="border-b border-border">
                  <th className="py-2 pr-4 font-medium">{t('drivers.fields.name')}</th>
                  <th className="py-2 pr-4 font-medium">{t('drivers.fields.workPhone')}</th>
                  <th className="py-2 pr-4 font-medium">{t('drivers.fields.vehicle')}</th>
                  <th className="py-2 pr-4 font-medium">{t('drivers.fields.type')}</th>
                  <th className="py-2 pr-4 font-medium">{t('drivers.onDuty')}</th>
                  <th className="py-2 pr-4 font-medium">{t('drivers.fields.active')}</th>
                  {canWrite && <th className="py-2" />}
                </tr>
              </thead>
              <tbody>
                {drivers.data.items.map((d) => (
                  <tr key={d.id} className="border-b border-border last:border-0">
                    <td className="py-2.5 pr-4">
                      <div className="font-medium">{d.name}</div>
                      <div className="text-xs text-text-muted">{d.email}</div>
                    </td>
                    <td className="py-2.5 pr-4 tabular-nums">{d.workPhone}</td>
                    <td className="py-2.5 pr-4">
                      {d.vehicle ? (
                        <>
                          <div>{d.vehicle.make} {d.vehicle.model}</div>
                          <div className="text-xs text-text-muted">{d.vehicle.plate} · {d.vehicle.categoryName}</div>
                        </>
                      ) : (
                        <span className="text-text-muted">—</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4">{t(`drivers.types.${d.driverType}`)}</td>
                    <td className="py-2.5 pr-4"><YesNo value={d.isAvailable} yes={t('drivers.onDuty')} no={t('drivers.offDuty')} /></td>
                    <td className="py-2.5 pr-4"><YesNo value={d.isActive && d.userIsActive} yes={t('common.active')} no={t('common.inactive')} /></td>
                    {canWrite && (
                      <td className="py-2.5 text-right">
                        <button type="button" onClick={() => openDialog(d)} className="text-sm underline-offset-2 hover:underline">
                          {t('common.edit')}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={drivers.data.page} pageSize={drivers.data.pageSize} total={drivers.data.total} onPage={(page) => update({ page })} />
          </>
        )}
      </Card>

      <DriverFormDialog open={dialogOpen} onOpenChange={setDialogOpen} driver={editing} />
    </section>
  );
}
