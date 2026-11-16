import { Link } from '@tanstack/react-router';
import { AlertTriangle, CalendarCheck, Car, CircleDot, type LucideIcon, Tag, UserPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCan } from '@/features/auth/can';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/shadcn/card';

const tileClass =
  'flex h-24 flex-col items-center justify-center gap-2 rounded-lg border p-3 text-center text-sm font-medium transition-colors hover:border-gold hover:bg-gold/10';

function Tile({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <>
      <Icon size={24} aria-hidden className="text-chart-1" />
      {label}
    </>
  );
}

/** Shortcuts to things that exist today (no buttons for screens not built yet). */
export function QuickAccess() {
  const { t } = useTranslation();
  const canDrivers = useCan('drivers.write');
  const canUsers = useCan('users.write');
  const canVehicles = useCan('vehicles.write');
  const canBookings = useCan('bookings.read');
  const canSpares = useCan('drivers.read');
  const canPricing = useCan('pricing.read');
  const any = (canDrivers && canUsers) || canVehicles || canBookings || canSpares || canPricing;
  if (!any) return null;

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle className="text-lg">{t('quick.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {canDrivers && canUsers && (
            <li>
              <Link to="/drivers" search={{ new: true }} className={`${tileClass} border-gold/60 bg-gold/10`}>
                <Tile icon={UserPlus} label={t('quick.addDriver')} />
              </Link>
            </li>
          )}
          {canVehicles && (
            <li>
              <Link to="/vehicles" search={{ new: true }} className={tileClass}>
                <Tile icon={Car} label={t('quick.addVehicle')} />
              </Link>
            </li>
          )}
          {canBookings && (
            <li>
              <Link to="/bookings" search={{ tab: 'attention' }} className={tileClass}>
                <Tile icon={AlertTriangle} label={t('quick.needsAttention')} />
              </Link>
            </li>
          )}
          {canBookings && (
            <li>
              <Link to="/bookings" search={{ tab: 'unassigned' }} className={tileClass}>
                <Tile icon={CircleDot} label={t('quick.unassigned')} />
              </Link>
            </li>
          )}
          {canSpares && (
            <li>
              <Link to="/spares" className={tileClass}>
                <Tile icon={CalendarCheck} label={t('quick.spares')} />
              </Link>
            </li>
          )}
          {canPricing && (
            <li>
              <Link to="/pricing" className={tileClass}>
                <Tile icon={Tag} label={t('quick.pricing')} />
              </Link>
            </li>
          )}
        </ul>
      </CardContent>
    </Card>
  );
}
