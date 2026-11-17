import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowLeft, UserPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { BookingDetailDto } from '@eul/api-client';
import { Can } from '@/features/auth/can';
import { formatDateTime, formatMoney } from '@/shared/lib/format';
import { Card, Field } from '@/shared/ui/card';
import { ErrorState, SkeletonRows } from '@/shared/ui/states';
import { StatusBadge } from '@/shared/ui/status-badge';
import { useBookingDetail } from './api';
import { AssignDialog } from './assign-dialog';
import { ASSIGNABLE } from './status-filters';

export function BookingDetailPage({ bookingId }: { bookingId: string }) {
  const { t } = useTranslation();
  const { data, isPending, isError, error, refetch } = useBookingDetail(bookingId);
  const [assignOpen, setAssignOpen] = useState(false);

  return (
    <section className="space-y-5">
      <Link to="/bookings" className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text">
        <ArrowLeft size={16} aria-hidden /> {t('bookings.backToList')}
      </Link>

      {isPending ? (
        <SkeletonRows rows={8} />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : (
        <>
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h1 className="font-display text-2xl font-semibold text-text">{data.reference}</h1>
              <StatusBadge status={data.status} />
              {data.type === 'SAME_DAY' && <span className="text-xs text-text-muted">{t('bookings.sameDay')}</span>}
            </div>
            {ASSIGNABLE.includes(data.status) && (
              <Can permission="dispatch.assign">
                <button
                  type="button"
                  onClick={() => setAssignOpen(true)}
                  className="inline-flex items-center gap-2 rounded-control bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                >
                  <UserPlus size={16} aria-hidden /> {t('assign.button')}
                </button>
              </Can>
            )}
          </header>

          <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
            <div className="space-y-5">
              <TripCard booking={data} />
              <HistoryCard booking={data} />
            </div>
            <div className="space-y-5">
              <ChauffeurCard booking={data} />
              <CustomerCard booking={data} />
              <PaymentCard booking={data} />
            </div>
          </div>

          <AssignDialog bookingId={data.id} reference={data.reference} open={assignOpen} onOpenChange={setAssignOpen} />
        </>
      )}
    </section>
  );
}

function TripCard({ booking: b }: { booking: BookingDetailDto }) {
  const { t } = useTranslation();
  return (
    <Card title={t('detail.trip')}>
      <dl>
        <Field label={t('detail.pickupTime')}><span className="tabular-nums">{formatDateTime(b.pickupAt)}</span></Field>
        <Field label={t('detail.from')}>{b.pickupAddress}</Field>
        <Field label={t('detail.to')}>{b.dropoffAddress}</Field>
        <Field label={t('detail.class')}>{b.categoryName}</Field>
        <Field label={t('detail.passengers')}>{b.passengers}</Field>
        <Field label={t('detail.flight')}>{b.flightNumber ?? '—'}</Field>
        <Field label={t('detail.notes')}>{b.notes ?? '—'}</Field>
      </dl>
    </Card>
  );
}

function ChauffeurCard({ booking: b }: { booking: BookingDetailDto }) {
  const { t } = useTranslation();
  const a = b.assignment;
  return (
    <Card title={t('detail.chauffeur')}>
      {a ? (
        <dl>
          <Field label={t('detail.driver')}>{a.driver.name}</Field>
          <Field label={t('detail.phone')}>{a.driver.workPhone}</Field>
          <Field label={t('detail.vehicle')}>{a.vehicle ? `${a.vehicle.make} ${a.vehicle.model} · ${a.vehicle.plate}` : '—'}</Field>
          <Field label={t('detail.assignedBy')}>
            {a.method === 'MANUAL' ? (a.assignedByName ?? t('detail.dispatcher')) : t('detail.acceptedByDriver')} · {formatDateTime(a.assignedAt)}
          </Field>
        </dl>
      ) : (
        <p className="text-sm text-text-muted">{t('detail.noDriver')}</p>
      )}
    </Card>
  );
}

function CustomerCard({ booking: b }: { booking: BookingDetailDto }) {
  const { t } = useTranslation();
  return (
    <Card title={t('detail.customer')}>
      <dl>
        <Field label={t('detail.name')}>{b.customer.name}</Field>
        <Field label={t('detail.email')}><a className="underline-offset-2 hover:underline" href={`mailto:${b.customer.email}`}>{b.customer.email}</a></Field>
        <Field label={t('detail.phone')}>{b.customer.phone ?? '—'}</Field>
        {b.passengerName && <Field label={t('detail.passenger')}>{`${b.passengerName}${b.passengerPhone ? ` · ${b.passengerPhone}` : ''}`}</Field>}
        <Field label={t('detail.language')}>{b.language.toUpperCase()}</Field>
      </dl>
    </Card>
  );
}

function PaymentCard({ booking: b }: { booking: BookingDetailDto }) {
  const { t } = useTranslation();
  return (
    <Card title={t('detail.payment')}>
      <dl>
        <Field label={t('detail.price')}><span className="tabular-nums">{formatMoney(b.priceMinor, b.currency)}</span></Field>
        <Field label={t('detail.paymentStatus')}>{b.payment ? t(`payment.${b.payment.status}`) : '—'}</Field>
        <Field label={t('detail.provider')}>{b.payment?.provider ?? '—'}</Field>
      </dl>
    </Card>
  );
}

function HistoryCard({ booking: b }: { booking: BookingDetailDto }) {
  const { t } = useTranslation();
  return (
    <Card title={t('detail.history')}>
      <ol className="space-y-3">
        {[...b.history].reverse().map((h, i) => (
          <li key={`${h.at}-${i}`} className="flex flex-wrap items-center gap-3 text-sm">
            <span className="w-40 text-text-muted tabular-nums">{formatDateTime(h.at)}</span>
            <StatusBadge status={h.toStatus} />
            <span className="text-text-muted">
              {h.actorName ?? t('detail.system')}
              {h.reason ? ` · ${h.reason}` : ''}
            </span>
          </li>
        ))}
      </ol>
    </Card>
  );
}
