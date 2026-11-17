import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/features/auth/auth-store';
import { useCan } from '@/features/auth/can';
import { ErrorState } from '@/shared/ui/states';
import { Skeleton } from '@/shared/ui/shadcn/skeleton';
import { useOverview } from './api';
import { BookingsChart } from './bookings-chart';
import { KpiRow } from './kpi-row';
import { LiveMapCard } from './live-map-card';
import { QuickAccess } from './quick-access';
import { RecentActivity } from './recent-activity';
import { RecentBookings } from './recent-bookings';
import { StatusDonut } from './status-donut';

function OverviewSkeleton() {
  return (
    <div className="space-y-6" aria-busy>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-40 rounded-xl" />
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr_1fr]">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    </div>
  );
}

/** Operations overview from the dashboard design. Every number comes from GET /dashboard/overview. */
export function OverviewPage() {
  const { t } = useTranslation();
  const name = useAuthStore((s) => s.user?.name ?? '');
  const canBookings = useCan('bookings.read');
  const overview = useOverview();

  return (
    <section className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold">{t('overview.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('overview.welcome', { name })}</p>
      </header>

      {!canBookings ? (
        <QuickAccess />
      ) : overview.isPending ? (
        <OverviewSkeleton />
      ) : overview.isError ? (
        <ErrorState error={overview.error} onRetry={() => void overview.refetch()} />
      ) : (
        <>
          <KpiRow data={overview.data} />
          <QuickAccess />

          <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr_1fr]">
            <BookingsChart series={overview.data.bookings.series} />
            {overview.data.vehicles && (
              <StatusDonut
                title={t('overview.vehicleStatus')}
                totalLabel={t('overview.totalVehicles')}
                slices={[
                  { key: 'available', label: t('overview.status.available'), value: overview.data.vehicles.available, color: 'var(--success)' },
                  { key: 'onTrip', label: t('overview.status.onTrip'), value: overview.data.vehicles.onTrip, color: 'var(--info)' },
                  { key: 'inactive', label: t('overview.status.inactive'), value: overview.data.vehicles.inactive, color: 'var(--chart-5)' },
                ]}
              />
            )}
            {overview.data.drivers && (
              <StatusDonut
                title={t('overview.driverStatus')}
                totalLabel={t('overview.totalDrivers')}
                slices={[
                  { key: 'available', label: t('overview.status.online'), value: overview.data.drivers.available, color: 'var(--success)' },
                  { key: 'onTrip', label: t('overview.status.onTrip'), value: overview.data.drivers.onTrip, color: 'var(--info)' },
                  { key: 'offDuty', label: t('overview.status.offDuty'), value: overview.data.drivers.offDuty, color: 'var(--warning)' },
                  { key: 'inactive', label: t('overview.status.inactive'), value: overview.data.drivers.inactive, color: 'var(--chart-5)' },
                ]}
              />
            )}
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr_1fr]">
            <RecentBookings rows={overview.data.recentBookings} />
            <LiveMapCard />
            {overview.data.activity && <RecentActivity items={overview.data.activity} />}
          </div>
        </>
      )}
    </section>
  );
}
