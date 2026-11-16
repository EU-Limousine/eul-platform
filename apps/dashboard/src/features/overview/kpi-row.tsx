import { CalendarCheck, Car, IdCard, Users, Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Overview } from './api';
import { KpiCard } from './kpi-card';
import { percentChange } from './trend';
import { formatMoney } from '@/shared/lib/format';

/** KPI cards; each one appears only when the user may see that data (the API leaves it null otherwise). */
export function KpiRow({ data }: { data: Overview }) {
  const { t } = useTranslation();
  const { bookings, customers, drivers, vehicles, revenue } = data;

  // Revenue is per currency: never added across DKK/EUR/USD (no conversion).
  const mainRevenue = revenue?.last7d[0];
  const prevSame = mainRevenue ? revenue?.prev7d.find((m) => m.currency === mainRevenue.currency) : undefined;
  const otherCurrencies = (revenue?.last7d.slice(1) ?? []).map((m) => formatMoney(m.amountMinor, m.currency)).join(' · ');

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <KpiCard
        icon={CalendarCheck}
        label={t('overview.kpi.bookings')}
        value={String(bookings.last7d)}
        change={percentChange(bookings.last7d, bookings.prev7d)}
        spark={bookings.series.map((d) => d.created)}
        hint={t('overview.kpi.pickupsToday', { count: bookings.pickupsToday })}
      />
      {customers && (
        <KpiCard
          icon={Users}
          label={t('overview.kpi.customers')}
          value={String(customers.total)}
          change={percentChange(customers.new7d, customers.prev7d)}
          hint={t('overview.kpi.newThisWeek', { count: customers.new7d })}
        />
      )}
      {drivers && (
        <KpiCard
          icon={IdCard}
          label={t('overview.kpi.drivers')}
          value={String(drivers.active)}
          hint={t('overview.kpi.availableNow', { count: drivers.available })}
        />
      )}
      {vehicles && (
        <KpiCard
          icon={Car}
          label={t('overview.kpi.vehicles')}
          value={String(vehicles.total)}
          hint={t('overview.kpi.availableNow', { count: vehicles.available })}
        />
      )}
      {revenue && (
        <KpiCard
          icon={Wallet}
          label={t('overview.kpi.revenue')}
          value={mainRevenue ? formatMoney(mainRevenue.amountMinor, mainRevenue.currency) : '—'}
          change={mainRevenue ? percentChange(mainRevenue.amountMinor, prevSame?.amountMinor ?? 0) : null}
          hint={otherCurrencies || t('overview.last7Days')}
        />
      )}
    </div>
  );
}
