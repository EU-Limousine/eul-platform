import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import type { BookingListItemDto } from '@eul/api-client';
import { formatDate, formatMoney, formatTime } from '@/shared/lib/format';
import { StatusBadge } from '@/shared/ui/status-badge';

/** Presentational: rows in, nothing fetched here. */
export function BookingsTable({ items }: { items: BookingListItemDto[] }) {
  const { t } = useTranslation();
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-xs text-text-muted">
          <tr className="border-b border-border">
            <th className="py-2 pr-4 font-medium">{t('bookings.col.pickup')}</th>
            <th className="py-2 pr-4 font-medium">{t('bookings.col.reference')}</th>
            <th className="py-2 pr-4 font-medium">{t('bookings.col.route')}</th>
            <th className="py-2 pr-4 font-medium">{t('bookings.col.class')}</th>
            <th className="py-2 pr-4 font-medium">{t('bookings.col.customer')}</th>
            <th className="py-2 pr-4 font-medium">{t('bookings.col.driver')}</th>
            <th className="py-2 pr-4 text-right font-medium">{t('bookings.col.price')}</th>
            <th className="py-2 font-medium">{t('bookings.col.status')}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((b) => (
            <tr key={b.id} className="border-b border-border last:border-0 hover:bg-canvas">
              <td className="py-3 pr-4 whitespace-nowrap">
                <div className="tabular-nums font-medium">{formatTime(b.pickupAt)}</div>
                <div className="text-xs text-text-muted">{formatDate(b.pickupAt)}</div>
              </td>
              <td className="py-3 pr-4 whitespace-nowrap">
                <Link
                  to="/bookings/$bookingId"
                  params={{ bookingId: b.id }}
                  className="font-medium text-text underline-offset-2 hover:underline"
                >
                  {b.reference}
                </Link>
                {b.type === 'SAME_DAY' && (
                  <div className="text-xs text-text-muted">{t('bookings.sameDay')}</div>
                )}
              </td>
              <td className="max-w-[320px] py-3 pr-4">
                <div className="truncate" title={b.pickupAddress}>{b.pickupAddress}</div>
                <div className="truncate text-xs text-text-muted" title={b.dropoffAddress}>→ {b.dropoffAddress}</div>
              </td>
              <td className="py-3 pr-4 whitespace-nowrap">
                {b.categoryName}
                <div className="text-xs text-text-muted">{t('bookings.passengers', { count: b.passengers })}</div>
              </td>
              <td className="py-3 pr-4">{b.customerName}</td>
              <td className="py-3 pr-4">{b.driverName ?? <span className="text-text-muted">—</span>}</td>
              <td className="py-3 pr-4 text-right tabular-nums whitespace-nowrap">{formatMoney(b.priceMinor, b.currency)}</td>
              <td className="py-3">
                <StatusBadge status={b.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
