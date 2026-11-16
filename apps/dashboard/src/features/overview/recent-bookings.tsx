import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Overview } from './api';
import { formatDateTime } from '@/shared/lib/format';
import { StatusBadge } from '@/shared/ui/status-badge';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/shared/ui/shadcn/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/shadcn/table';

export function RecentBookings({ rows }: { rows: Overview['recentBookings'] }) {
  const { t } = useTranslation();
  return (
    <Card className="gap-3">
      <CardHeader>
        <CardTitle className="text-lg">{t('overview.recentBookings')}</CardTitle>
        <CardAction>
          <Link to="/bookings" className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
            {t('overview.viewAll')} <ArrowRight size={14} aria-hidden />
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t('overview.noBookings')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('bookings.col.reference')}</TableHead>
                <TableHead>{t('bookings.col.customer')}</TableHead>
                <TableHead className="hidden md:table-cell">{t('bookings.col.class')}</TableHead>
                <TableHead className="hidden md:table-cell">{t('bookings.col.driver')}</TableHead>
                <TableHead>{t('bookings.col.pickup')}</TableHead>
                <TableHead>{t('bookings.col.status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>
                    <Link to="/bookings/$bookingId" params={{ bookingId: b.id }} className="font-medium underline-offset-4 hover:underline">
                      {b.reference}
                    </Link>
                  </TableCell>
                  <TableCell>{b.customerName}</TableCell>
                  <TableCell className="hidden md:table-cell">{b.categoryName}</TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">{b.driverName ?? '—'}</TableCell>
                  <TableCell className="tabular-nums">{formatDateTime(b.pickupAt)}</TableCell>
                  <TableCell>
                    <StatusBadge status={b.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
