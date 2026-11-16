import type { LucideIcon } from 'lucide-react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
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

/**
 * One KPI from the dashboard design: icon + label on top, big number, trend, sparkline underneath.
 * Stacked (not side by side) so the label never gets squeezed to nothing in narrow cards.
 */
export function KpiCard({ icon: Icon, label, value, change, spark, hint }: KpiCardProps) {
  const { t } = useTranslation();
  const up = (change ?? 0) >= 0;
  return (
    <Card className="gap-3 p-5">
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gold/15 text-chart-1" aria-hidden>
          <Icon size={20} />
        </span>
        <p className="min-w-0 text-sm leading-tight text-muted-foreground">{label}</p>
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-2xl font-semibold tabular-nums">{value}</p>
          {change != null ? (
            <p className={cn('mt-1 flex items-center gap-1 text-xs font-medium tabular-nums', up ? 'text-success' : 'text-danger')}>
              {up ? <TrendingUp size={14} aria-hidden /> : <TrendingDown size={14} aria-hidden />}
              {t('overview.vsLastWeek', { value: `${up ? '+' : ''}${change}%` })}
            </p>
          ) : (
            hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
          )}
        </div>
        {spark && spark.length > 1 && (
          <div className="h-10 w-20 shrink-0" aria-hidden>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={spark.map((v, i) => ({ i, v }))} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
                <Area type="monotone" dataKey="v" stroke="var(--chart-1)" strokeWidth={2} fill="var(--chart-1)" fillOpacity={0.15} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </Card>
  );
}
