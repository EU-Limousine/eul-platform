import {
  AlertTriangle,
  Ban,
  Bell,
  Car,
  CheckCircle2,
  CircleDot,
  Clock,
  type LucideIcon,
  MapPin,
  Navigation,
  UserCheck,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * The ONE mapping from booking status to label, colour and icon (CLAUDE.md §4.1).
 * Status is always shown with colour AND icon AND text. Never add statuses here.
 */
type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

const STATUS: Record<string, { icon: LucideIcon; tone: Tone }> = {
  NEW: { icon: CircleDot, tone: 'neutral' },
  PENDING_DISPATCH: { icon: Clock, tone: 'warning' },
  DRIVERS_NOTIFIED: { icon: Bell, tone: 'warning' },
  ASSIGNED: { icon: UserCheck, tone: 'info' },
  DRIVER_EN_ROUTE: { icon: Navigation, tone: 'info' },
  ARRIVED: { icon: MapPin, tone: 'success' },
  IN_JOURNEY: { icon: Car, tone: 'info' },
  COMPLETED: { icon: CheckCircle2, tone: 'success' },
  CANCELLED: { icon: Ban, tone: 'neutral' },
  NEEDS_ATTENTION: { icon: AlertTriangle, tone: 'danger' },
};

const TONE_CLASSES: Record<Tone, string> = {
  neutral: 'bg-canvas text-text-muted border-border',
  info: 'bg-info-bg text-text border-info/30',
  success: 'bg-success-bg text-text border-success/30',
  warning: 'bg-warning-bg text-text border-warning/40',
  danger: 'bg-danger-bg text-text border-danger/40',
};

const ICON_CLASSES: Record<Tone, string> = {
  neutral: 'text-text-muted',
  info: 'text-info',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
};

export function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const config = STATUS[status] ?? { icon: CircleDot, tone: 'neutral' as const };
  const Icon = config.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${TONE_CLASSES[config.tone]}`}
    >
      <Icon size={13} aria-hidden className={ICON_CLASSES[config.tone]} />
      {t(`status.${status}`)}
    </span>
  );
}
