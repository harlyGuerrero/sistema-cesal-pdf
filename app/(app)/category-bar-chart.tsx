"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface CategoryBarDatum {
  name: string;
  count: number;
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: CategoryBarDatum }[];
}) {
  if (!active || !payload?.length) return null;
  const datum = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-medium text-popover-foreground">{datum.name}</p>
      <p className="text-muted-foreground">{datum.count.toLocaleString("es-PE")} activos</p>
    </div>
  );
}

export function CategoryBarChart({ data }: { data: CategoryBarDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="name"
          tickLine={false}
          axisLine={false}
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          interval={0}
          tickFormatter={(value: string) =>
            value.length > 14 ? `${value.slice(0, 14)}…` : value
          }
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          allowDecimals={false}
        />
        <Tooltip cursor={{ fill: "var(--muted)" }} content={<ChartTooltip />} />
        <Bar dataKey="count" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={64} />
      </BarChart>
    </ResponsiveContainer>
  );
}
