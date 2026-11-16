import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ArrowDown, ArrowUp, Copy, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCan } from '@/features/auth/can';
import { copenhagenToday, formatLongDate, previousDate } from '@/shared/lib/format';
import { Card } from '@/shared/ui/card';
import { FormAlert, inputClass, PrimaryButton, SecondaryButton } from '@/shared/ui/form';
import { PageTitle } from '@/shared/ui/page-title';
import { EmptyState, ErrorState, SkeletonRows, errorMessage } from '@/shared/ui/states';
import { useActiveDrivers, useLoadSpareDay, useSaveSpareDay, useSpareDay } from './api';

interface SpareRow {
  driverId: string;
  name: string;
}

/**
 * Spare drivers per date (§4.9). Order matters: spare offers go out in chunks from the top.
 * A spare driver is left out of that date's regular offers.
 */
export function SparesPage({ date: dateParam }: { date?: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const canWrite = useCan('dispatch.spares.write');
  const date = dateParam ?? copenhagenToday();

  const day = useSpareDay(date);
  const drivers = useActiveDrivers();
  const loadDay = useLoadSpareDay();
  const save = useSaveSpareDay();

  const [rows, setRows] = useState<SpareRow[]>([]);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [toAdd, setToAdd] = useState('');

  // Load the saved list whenever the date changes (unless the user has unsaved changes for this date).
  useEffect(() => {
    if (day.data && !dirty) setRows(day.data.drivers.map((d) => ({ driverId: d.driverId, name: d.name })));
  }, [day.data, dirty]);

  useEffect(() => {
    setDirty(false);
    setMessage(null);
  }, [date]);

  const change = (next: SpareRow[]) => {
    setRows(next);
    setDirty(true);
    setMessage(null);
  };
  const move = (index: number, by: -1 | 1) => {
    const next = [...rows];
    const [row] = next.splice(index, 1);
    if (row) next.splice(index + by, 0, row);
    change(next);
  };
  const add = () => {
    const driver = drivers.data?.items.find((d) => d.id === toAdd);
    if (driver && !rows.some((r) => r.driverId === driver.id)) change([...rows, { driverId: driver.id, name: driver.name }]);
    setToAdd('');
  };
  const copyPrevious = async () => {
    try {
      const previous = await loadDay(previousDate(date));
      change(previous.drivers.map((d) => ({ driverId: d.driverId, name: d.name })));
    } catch (error) {
      setMessage(errorMessage(error, t('common.loadError')));
    }
  };
  const onSave = () =>
    save.mutate(
      { data: { date, driverIds: rows.map((r) => r.driverId) } },
      { onSuccess: () => setDirty(false), onError: (error) => setMessage(errorMessage(error, t('common.saveError'))) },
    );

  const available = drivers.data?.items.filter((d) => !rows.some((r) => r.driverId === d.id)) ?? [];

  return (
    <section className="space-y-5">
      <div>
        <PageTitle>{t('spares.title')}</PageTitle>
        <p className="mt-1 max-w-2xl text-sm text-text-muted">{t('spares.subtitle')}</p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-xs text-text-muted">{t('spares.date')}</span>
          <input
            type="date"
            value={date}
            onChange={(e) => e.target.value && void navigate({ to: '/spares', search: { date: e.target.value } })}
            className="rounded-control border border-border bg-surface px-3 py-1.5"
          />
        </label>
        <span className="pb-2 text-sm text-text-muted">{formatLongDate(date)}</span>
      </div>

      <Card
        title={t('spares.listTitle', { count: rows.length })}
        actions={
          canWrite && (
            <SecondaryButton onClick={() => void copyPrevious()}>
              <Copy size={14} aria-hidden /> {t('spares.copyPrevious')}
            </SecondaryButton>
          )
        }
      >
        <div className="space-y-4">
          <FormAlert message={message} />
          {day.isPending ? (
            <SkeletonRows rows={3} />
          ) : day.isError ? (
            <ErrorState error={day.error} onRetry={() => void day.refetch()} />
          ) : rows.length === 0 ? (
            <EmptyState message={t('spares.empty')} />
          ) : (
            <ol className="space-y-2">
              {rows.map((row, index) => (
                <li key={row.driverId} className="flex items-center gap-3 rounded-control border border-border px-3 py-2 text-sm">
                  <span className="w-6 text-text-muted tabular-nums">{index + 1}.</span>
                  <span className="flex-1 font-medium">{row.name}</span>
                  {canWrite && (
                    <span className="flex gap-1">
                      <IconButton label={t('spares.moveUp')} disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp size={15} /></IconButton>
                      <IconButton label={t('spares.moveDown')} disabled={index === rows.length - 1} onClick={() => move(index, 1)}><ArrowDown size={15} /></IconButton>
                      <IconButton label={t('spares.remove')} onClick={() => change(rows.filter((r) => r.driverId !== row.driverId))}><Trash2 size={15} /></IconButton>
                    </span>
                  )}
                </li>
              ))}
            </ol>
          )}

          {canWrite && (
            <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
              <label className="sr-only" htmlFor="add-spare">{t('spares.addDriver')}</label>
              <select id="add-spare" className={`${inputClass} max-w-xs`} value={toAdd} onChange={(e) => setToAdd(e.target.value)}>
                <option value="">{t('spares.chooseDriver')}</option>
                {available.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}{d.vehicle ? ` · ${d.vehicle.categoryName}` : ''}</option>
                ))}
              </select>
              <SecondaryButton onClick={add} disabled={!toAdd}>{t('spares.addDriver')}</SecondaryButton>
              <span className="flex-1" />
              {dirty && <span className="text-xs text-text-muted">{t('spares.unsaved')}</span>}
              <PrimaryButton onClick={onSave} disabled={!dirty || save.isPending}>
                {save.isPending ? t('common.saving') : t('common.save')}
              </PrimaryButton>
            </div>
          )}
        </div>
      </Card>
    </section>
  );
}

function IconButton({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} className="rounded-control p-1.5 text-text-muted hover:bg-canvas hover:text-text disabled:opacity-30">
      {children}
    </button>
  );
}
