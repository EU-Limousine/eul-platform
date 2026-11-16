import { Link } from '@tanstack/react-router';
import { AlertTriangle, Bell, CircleDot } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCan } from '@/features/auth/can';
import { useOverview } from '@/features/overview/api';
import { Button } from '@/shared/ui/shadcn/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/shadcn/dropdown-menu';

/** Bell with real counts: bookings that need a dispatcher. The red dot is the needs-attention count. */
export function AlertsBell() {
  const { t } = useTranslation();
  const allowed = useCan('bookings.read');
  const overview = useOverview();
  if (!allowed) return null;

  const attention = overview.data?.bookings.needsAttention ?? 0;
  const unassigned = overview.data?.bookings.unassigned ?? 0;
  const label = attention > 0 ? t('alerts.labelCount', { count: attention }) : t('alerts.label');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={label} className="relative">
          <Bell aria-hidden />
          {attention > 0 && (
            <span className="absolute -top-0.5 -right-0.5 grid min-w-5 place-items-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white tabular-nums">
              {attention > 99 ? '99+' : attention}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>{t('alerts.title')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/bookings" search={{ tab: 'attention' }} className="flex items-center gap-2">
            <AlertTriangle className="text-danger" aria-hidden />
            <span className="flex-1">{t('alerts.needsAttention')}</span>
            <span className="font-semibold tabular-nums">{attention}</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/bookings" search={{ tab: 'unassigned' }} className="flex items-center gap-2">
            <CircleDot className="text-warning" aria-hidden />
            <span className="flex-1">{t('alerts.unassigned')}</span>
            <span className="font-semibold tabular-nums">{unassigned}</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
