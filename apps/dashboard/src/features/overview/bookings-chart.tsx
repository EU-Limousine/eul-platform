import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { useTranslation } from 'react-i18next';
import type { Overview } from './api';
import { weekdayLabel } from './trend';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/shadcn/card';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/shared/ui/shadcn/chart';

/** Bookings created vs completed per day, last 7 Copenhagen days. One axis, two series, legend + tooltip. */
export function BookingsChart({ series }: { series: Overview['bookings']['series'] }) {
  const { t } = useTranslation();
  const config = {
    created: { label: t('overview.chart.created'), color: 'var(--chart-1)' },
    completed: { label: t('overview.chart.completed'), color: 'var(--chart-2)' },
  } satisfies ChartConfig;
  const data = series.map((d) => ({ ...d, day: weekdayLabel(d.date) }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 className="text-lg">{t('overview.chart.title')}</h2>
        </CardTitle>
        <CardDescription>{t('overview.last7Days')}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="aspect-auto h-64 w-full">
          <AreaChart data={data} margin={{ left: -16, right: 8, top: 8 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={40} />
            <ChartTooltip cursor content={<ChartTooltipContent indicator="line" />} />
            <Area
              dataKey="created"
              type="monotone"
              stroke="var(--color-created)"
              strokeWidth={2}
              fill="var(--color-created)"
              fillOpacity={0.15}
              dot={{ r: 3 }}
            />
            <Area
              dataKey="completed"
              type="monotone"
              stroke="var(--color-completed)"
              strokeWidth={2}
              fill="var(--color-completed)"
              fillOpacity={0.15}
              dot={{ r: 3 }}
            />
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
