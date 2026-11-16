import type { LucideIcon } from 'lucide-react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { Area, AreaChart } from 'recharts';
import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/utils';
import { Card } from '@/shared/ui/shadcn/card';

export interface KpiCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  /** Week-over-week % change; omitted or null hides the trend. */
  change?: number | null;
  /** Small trend line (one value per day). */
  spark?: number[];
  hint?: string;
}

/** One KPI from the dashboard design: icon, label, big number, trend and a sparkline. */
export function KpiCard({ icon: Icon, label, value, change, spark, hint }: KpiCardProps) {
  const { t } = useTranslation();
  const up = (change ?? 0) >= 0;
  return (
    <Card className="flex-row items-center gap-4 p-5">
      <span className="grid size-12 shrink-0 place-items-center rounded-full bg-gold/15 text-chart-1" aria-hidden>
        <Icon size={22} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
        {change != null ? (
          <p className={cn('mt-1 flex items-center gap-1 text-xs font-medium tabular-nums', up ? 'text-success' : 'text-danger')}>
            {up ? <TrendingUp size={14} aria-hidden /> : <TrendingDown size={14} aria-hidden />}
            {t('overview.vsLastWeek', { value: `${up ? '+' : ''}${change}%` })}
          </p>
        ) : (
          hint && <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p>
        )}
      </div>
      {spark && spark.length > 1 && (
        <div className="hidden h-10 w-20 shrink-0 sm:block" aria-hidden>
          <AreaChart width={80} height={40} data={spark.map((v, i) => ({ i, v }))} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
            <Area type="monotone" dataKey="v" stroke="var(--chart-1)" strokeWidth={2} fill="var(--chart-1)" fillOpacity={0.15} isAnimationActive={false} />
          </AreaChart>
        </div>
      )}
    </Card>
  );
}
