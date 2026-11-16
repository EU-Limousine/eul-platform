import { Link } from '@tanstack/react-router';
import {
  ArrowRight,
  CalendarPlus,
  Car,
  CreditCard,
  type LucideIcon,
  ScrollText,
  Shield,
  Tag,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Overview } from './api';
import { timeAgo } from './trend';
import { useCan } from '@/features/auth/can';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/shared/ui/shadcn/card';

/** Icon by the first part of the audit action code (booking.assign → booking). */
function iconFor(action: string): LucideIcon {
  if (action === 'booking.create') return CalendarPlus;
  if (action === 'booking.assign') return UserCheck;
  const area = action.split('.')[0];
  const map: Record<string, LucideIcon> = {
    vehicle: Car,
    driver: Users,
    pricing: Tag,
    user: UserPlus,
    dispatch: Shield,
    checkout: CreditCard,
    payment: CreditCard,
  };
  return (area && map[area]) || ScrollText;
}

export function RecentActivity({ items }: { items: NonNullable<Overview['activity']> }) {
  const { t } = useTranslation();
  const canAudit = useCan('audit.read');
  return (
    <Card className="gap-3">
      <CardHeader>
        <CardTitle className="text-lg">{t('overview.activity.title')}</CardTitle>
        {canAudit && (
          <CardAction>
            <Link to="/audit" className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
              {t('overview.viewAll')} <ArrowRight size={14} aria-hidden />
            </Link>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t('overview.activity.empty')}</p>
        ) : (
          <ul className="space-y-3">
            {items.map((a) => {
              const Icon = iconFor(a.action);
              return (
                <li key={a.id} className="flex items-start gap-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-gold/15 text-chart-1" aria-hidden>
                    <Icon size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {t(`activity.${a.action}`, { defaultValue: a.action })}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{a.actorName ?? t('detail.system')}</p>
                  </div>
                  <time dateTime={a.at} className="shrink-0 text-xs text-muted-foreground">
                    {timeAgo(a.at)}
                  </time>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
