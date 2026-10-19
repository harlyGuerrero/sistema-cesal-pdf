"use client";

import { Bar, BarChart, CartesianGrid, Rectangle, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

export interface SedeBarDatum {
  sede: string;
  activos: number;
}

const chartConfig = {
  activos: { label: "Activos", color: "var(--chart-1)" },
} satisfies ChartConfig;

// Patrón "Bar Chart - Active" de shadcn: una barra destacada con borde
// punteado. En recharts 3 Bar ya no acepta `activeIndex` (lo maneja el
// Tooltip), así que el destacado se dibuja desde `shape` comparando el índice.
export function SedeBarChart({ data, activeIndex }: { data: SedeBarDatum[]; activeIndex: number }) {
  if (data.length === 0) {
    return <p className="py-12 text-center text-sm text-muted-foreground">Sin sedes registradas.</p>;
  }

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-[320px] w-full">
      <BarChart accessibilityLayer data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="sede"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          interval={0}
          tickFormatter={(value: string) => (value.length > 14 ? `${value.slice(0, 14)}…` : value)}
        />
        <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={32} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <Bar
          dataKey="activos"
          fill="var(--color-activos)"
          strokeWidth={2}
          radius={8}
          maxBarSize={64}
          shape={(props) =>
            props.index === activeIndex ? (
              <Rectangle
                {...props}
                fillOpacity={0.8}
                stroke="var(--color-activos)"
                strokeDasharray={4}
                strokeDashoffset={4}
              />
            ) : (
              <Rectangle {...props} />
            )
          }
        />
      </BarChart>
    </ChartContainer>
  );
}
