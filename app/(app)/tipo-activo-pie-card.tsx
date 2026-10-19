"use client";

import { useId, useMemo, useState } from "react";
import { Label, Pie, PieChart, Sector } from "recharts";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartStyle,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface TipoActivoPieDatum {
  key: string;
  label: string;
  value: number;
  color: string;
}

// Patrón "Pie Chart - Interactive" de shadcn: el Select del encabezado elige
// el tipo destacado, que se dibuja agrandado y con un anillo exterior, y su
// cantidad va al centro. En recharts 3 Pie ya no acepta `activeIndex` /
// `activeShape`, así que el destacado se dibuja desde `shape` comparando el
// índice. Clic en un sector o en una fila de la leyenda también lo elige.
export function TipoActivoPieCard({ data, total }: { data: TipoActivoPieDatum[]; total: number }) {
  const id = `pie-tipo-activo-${useId().replace(/:/g, "")}`;

  // Por defecto, el tipo con más activos.
  const [activeKey, setActiveKey] = useState(
    () => data.reduce((max, datum) => (datum.value > max.value ? datum : max), data[0])?.key ?? ""
  );
  const activeIndex = data.findIndex((datum) => datum.key === activeKey);
  const active = data[activeIndex];

  const chartConfig = useMemo(
    () =>
      Object.fromEntries(
        data.map((datum) => [datum.key, { label: datum.label, color: datum.color }])
      ) satisfies ChartConfig,
    [data]
  );
  const pieData = useMemo(
    () => data.map((datum) => ({ ...datum, fill: `var(--color-${datum.key})` })),
    [data]
  );

  const porcentaje = (value: number) => (total > 0 ? Math.round((value / total) * 100) : 0);

  return (
    <Card data-chart={id}>
      <ChartStyle id={id} config={chartConfig} />
      <CardHeader>
        <CardTitle className="text-base font-semibold">Activos por tipo</CardTitle>
        <CardDescription>
          {total.toLocaleString("es-PE")} {total === 1 ? "activo" : "activos"} en total
        </CardDescription>
        {total > 0 && (
          <CardAction>
            <Select value={activeKey} onValueChange={(value) => setActiveKey(String(value))}>
              <SelectTrigger size="sm" className="w-40 max-w-[45vw]" aria-label="Elegir tipo de activo">
                <SelectValue placeholder="Elegir tipo" />
              </SelectTrigger>
              <SelectContent align="end">
                {data.map((datum) => (
                  <SelectItem key={datum.key} value={datum.key}>
                    <span className="flex items-center gap-2 text-xs">
                      <span className="size-3 shrink-0 rounded-xs" style={{ backgroundColor: `var(--color-${datum.key})` }} />
                      {datum.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardAction>
        )}
      </CardHeader>
      {total === 0 ? (
        <CardContent>
          <p className="py-12 text-center text-sm text-muted-foreground">Sin activos registrados todavía.</p>
        </CardContent>
      ) : (
        <CardContent className="space-y-6">
          <ChartContainer id={id} config={chartConfig} className="mx-auto aspect-square w-full max-w-[260px]">
            <PieChart>
              <ChartTooltip cursor={false} content={<ChartTooltipContent nameKey="key" hideLabel />} />
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="key"
                innerRadius={60}
                outerRadius={90}
                strokeWidth={5}
                onClick={(_, index) => setActiveKey(data[index].key)}
                shape={({ outerRadius = 0, ...props }) =>
                  props.index === activeIndex ? (
                    <g>
                      <Sector {...props} outerRadius={outerRadius + 8} />
                      <Sector {...props} outerRadius={outerRadius + 20} innerRadius={outerRadius + 11} />
                    </g>
                  ) : (
                    <Sector {...props} outerRadius={outerRadius} />
                  )
                }
              >
                <Label
                  content={({ viewBox }) => {
                    if (!active || !viewBox || !("cx" in viewBox) || !("cy" in viewBox)) return null;
                    return (
                      <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                        <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-3xl font-semibold tabular-nums">
                          {active.value.toLocaleString("es-PE")}
                        </tspan>
                        <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 22} className="fill-muted-foreground text-xs">
                          {active.value === 1 ? "activo" : "activos"} · {porcentaje(active.value)}%
                        </tspan>
                      </text>
                    );
                  }}
                />
              </Pie>
            </PieChart>
          </ChartContainer>

          <ul className="space-y-0.5">
            {data.map((datum) => (
              <li key={datum.key}>
                <button
                  type="button"
                  onClick={() => setActiveKey(datum.key)}
                  aria-pressed={datum.key === activeKey}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1 text-left text-sm transition-colors hover:bg-muted",
                    datum.key === activeKey && "bg-muted font-medium"
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: `var(--color-${datum.key})` }} />
                    <span className="truncate">{datum.label}</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {datum.value.toLocaleString("es-PE")}
                    {total > 0 && ` (${porcentaje(datum.value)}%)`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </CardContent>
      )}
    </Card>
  );
}
