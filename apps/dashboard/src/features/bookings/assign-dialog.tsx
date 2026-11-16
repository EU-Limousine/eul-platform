import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { AlertTriangle, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ApiError, type DriverCandidateDto } from '@eul/api-client';
import { EmptyState, ErrorState, SkeletonRows, errorMessage } from '@/shared/ui/states';
import { useAssignDriver, useDriverCandidates } from './api';

interface Props {
  bookingId: string;
  reference: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Manual assignment (§4.2 step 9). Spare drivers for the date come first (sorted by the API). */
export function AssignDialog({ bookingId, reference, open, onOpenChange }: Props) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<string | null>(null);
  const candidates = useDriverCandidates(bookingId, open);
  const assign = useAssignDriver(bookingId);

  const conflict = assign.error instanceof ApiError && assign.error.status === 409;

  function close(next: boolean) {
    if (!next) {
      setSelected(null);
      assign.reset();
    }
    onOpenChange(next);
  }

  function confirm() {
    if (!selected) return;
    assign.mutate({ id: bookingId, data: { driverId: selected } }, { onSuccess: () => close(false) });
  }

  return (
    <Dialog.Root open={open} onOpenChange={close}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-navy-950/50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 flex max-h-[85vh] w-[min(640px,92vw)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-card bg-surface shadow-xl">
          <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
            <div>
              <Dialog.Title className="font-semibold text-text">{t('assign.title')}</Dialog.Title>
              <Dialog.Description className="text-sm text-text-muted">{t('assign.description', { reference })}</Dialog.Description>
            </div>
            <Dialog.Close aria-label={t('common.close')} className="rounded-control p-1 text-text-muted hover:bg-canvas">
              <X size={18} aria-hidden />
            </Dialog.Close>
          </header>

          <div className="flex-1 overflow-y-auto px-5 py-3">
            {candidates.isPending ? (
              <SkeletonRows rows={4} />
            ) : candidates.isError ? (
              <ErrorState error={candidates.error} onRetry={() => void candidates.refetch()} />
            ) : candidates.data.length === 0 ? (
              <EmptyState message={t('assign.noDrivers')} />
            ) : (
              <fieldset>
                <legend className="sr-only">{t('assign.chooseDriver')}</legend>
                <ul className="space-y-2">
                  {candidates.data.map((c) => (
                    <CandidateRow key={c.driverId} candidate={c} checked={selected === c.driverId} onSelect={() => setSelected(c.driverId)} />
                  ))}
                </ul>
              </fieldset>
            )}
          </div>

          {assign.isError && (
            <p role="alert" className="mx-5 mb-3 rounded-control bg-danger-bg px-3 py-2 text-sm text-text">
              {conflict ? t('assign.conflict') : errorMessage(assign.error, t('common.saveError'))}
            </p>
          )}

          <footer className="flex justify-end gap-2 border-t border-border px-5 py-3">
            <Dialog.Close className="rounded-control border border-border px-4 py-2 text-sm hover:bg-canvas">{t('common.cancel')}</Dialog.Close>
            <button
              type="button"
              disabled={!selected || assign.isPending || conflict}
              onClick={confirm}
              className="rounded-control bg-navy-900 px-4 py-2 text-sm font-medium text-on-dark disabled:opacity-50"
            >
              {assign.isPending ? t('assign.assigning') : t('assign.confirm')}
            </button>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function CandidateRow({ candidate: c, checked, onSelect }: { candidate: DriverCandidateDto; checked: boolean; onSelect: () => void }) {
  const { t } = useTranslation();
  const noVehicle = !c.vehicle;
  return (
    <li>
      <label
        className={`flex cursor-pointer items-start gap-3 rounded-control border px-3 py-2.5 ${
          checked ? 'border-navy-900 bg-canvas' : 'border-border hover:bg-canvas'
        } ${noVehicle ? 'cursor-not-allowed opacity-60' : ''}`}
      >
        <input type="radio" name="driver" className="mt-1" checked={checked} disabled={noVehicle} onChange={onSelect} />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-text">{c.name}</span>
            {c.isSpare && <Tag tone="gold">{t('assign.spare')}</Tag>}
            {c.isAvailable && <Tag tone="green">{t('assign.onDuty')}</Tag>}
            {c.tripsSameDay > 0 && <Tag tone="grey">{t('assign.tripsToday', { count: c.tripsSameDay })}</Tag>}
          </span>
          <span className="block text-xs text-text-muted">
            {c.vehicle ? `${c.vehicle.make} ${c.vehicle.model} · ${c.vehicle.plate} · ${c.vehicleCategoryName ?? ''}` : t('assign.noVehicle')} · {c.workPhone}
          </span>
          {c.vehicle && (!c.fitsPassengers || !c.categoryMatches) && (
            <span className="mt-1 flex items-center gap-1 text-xs text-text">
              <AlertTriangle size={12} aria-hidden className="text-warning" />
              {!c.fitsPassengers ? t('assign.tooSmall') : t('assign.otherCategory')}
            </span>
          )}
        </span>
      </label>
    </li>
  );
}

function Tag({ tone, children }: { tone: 'gold' | 'green' | 'grey'; children: string }) {
  const classes = {
    gold: 'border-gold bg-warning-bg',
    green: 'border-success/40 bg-success-bg',
    grey: 'border-border bg-canvas',
  }[tone];
  return <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium text-text ${classes}`}>{children}</span>;
}
