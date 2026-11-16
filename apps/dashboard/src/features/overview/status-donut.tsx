import { Cell, Label, Pie, PieChart } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/shadcn/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/shared/ui/shadcn/chart';

export interface DonutSlice {
  key: string;
  label: string;
  value: number;
  color: string; // a CSS variable, e.g. var(--success)
}

/**
 * Status split (vehicles or drivers) with the total in the middle.
 * The legend list always shows label + number, so colour is never the only cue.
 */
export function StatusDonut({ title, totalLabel, slices }: { title: string; totalLabel: string; slices: DonutSlice[] }) {
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const config = Object.fromEntries(slices.map((s) => [s.key, { label: s.label, color: s.color }])) satisfies ChartConfig;
  const shown = slices.filter((s) => s.value > 0);
  // Nothing yet: one grey ring so the card keeps its shape.
  const pieData: DonutSlice[] = shown.length ? shown : [{ key: 'empty', label: '', value: 1, color: 'var(--muted)' }];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-6 sm:flex-row">
        <ChartContainer config={config} className="aspect-square h-44 shrink-0">
          <PieChart>
            {shown.length > 0 && <ChartTooltip content={<ChartTooltipContent nameKey="key" hideLabel />} />}
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="key"
              innerRadius={52}
              outerRadius={78}
              paddingAngle={pieData.length > 1 ? 2 : 0}
              stroke="var(--card)"
              strokeWidth={2}
            >
              {pieData.map((s) => (
                <Cell key={s.key} fill={s.color} />
              ))}
              <Label
                content={({ viewBox }) =>
                  viewBox && 'cx' in viewBox ? (
                    <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                      <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-2xl font-semibold">
                        {total}
                      </tspan>
                      <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 20} className="fill-muted-foreground text-xs">
                        {totalLabel}
                      </tspan>
                    </text>
                  ) : null
                }
              />
            </Pie>
          </PieChart>
        </ChartContainer>
        <ul className="w-full divide-y text-sm">
          {slices.map((s) => (
            <li key={s.key} className="flex items-center gap-3 py-2">
              <span className="size-2.5 rounded-full" style={{ background: s.color }} aria-hidden />
              <span className="flex-1">{s.label}</span>
              <span className="font-semibold tabular-nums">{s.value}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
