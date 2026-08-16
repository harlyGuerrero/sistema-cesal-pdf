"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

export interface DonutDatum {
  key: string;
  label: string;
  value: number;
  color: string;
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: DonutDatum }[];
}) {
  if (!active || !payload?.length) return null;
  const datum = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-medium text-popover-foreground">{datum.label}</p>
      <p className="text-muted-foreground">{datum.value.toLocaleString("es-PE")} activos</p>
    </div>
  );
}

export function DonutChart({
  data,
  total,
  centerLabel,
}: {
  data: DonutDatum[];
  total: number;
  centerLabel: string;
}) {
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            innerRadius={70}
            outerRadius={100}
            paddingAngle={data.filter((d) => d.value > 0).length > 1 ? 3 : 0}
            strokeWidth={2}
            stroke="var(--card)"
          >
            {data.map((datum) => (
              <Cell key={datum.key} fill={datum.color} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold tabular-nums text-foreground">
          {total.toLocaleString("es-PE")}
        </span>
        <span className="text-xs text-muted-foreground">{centerLabel}</span>
      </div>
    </div>
  );
}
