"use client";

import { useEffect, useRef, useState } from "react";
import { Bar, BarChart, CartesianGrid, Rectangle, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

export interface SedeBarDatum {
  sede: string;
  activos: number;
}

// Ancho mínimo por sede para que su nombre quepa derecho; por debajo, los
// nombres se inclinan en vez de montarse unos sobre otros.
const ANCHO_POR_ETIQUETA = 78;

const chartConfig = {
  activos: { label: "Activos", color: "var(--chart-1)" },
} satisfies ChartConfig;

// Patrón "Bar Chart - Active" de shadcn: una barra destacada con borde
// punteado. En recharts 3 Bar ya no acepta `activeIndex` (lo maneja el
// Tooltip), así que el destacado se dibuja desde `shape` comparando el índice.
export function SedeBarChart({ data, activeIndex }: { data: SedeBarDatum[]; activeIndex: number }) {
  // Se mide el ancho real del gráfico, no el de la ventana: en el Dashboard la
  // tarjeta también es angosta en pantallas medianas (grilla de 3 columnas).
  const contenedorRef = useRef<HTMLDivElement>(null);
  const [ancho, setAncho] = useState<number | null>(null);
  useEffect(() => {
    const el = contenedorRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entrada]) => setAncho(entrada.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const inclinar = ancho !== null && data.length > 0 && (ancho - 40) / data.length < ANCHO_POR_ETIQUETA;

  if (data.length === 0) {
    return <p className="py-12 text-center text-sm text-muted-foreground">Sin sedes registradas.</p>;
  }

  return (
    <div ref={contenedorRef} className="w-full">
      <ChartContainer config={chartConfig} className="aspect-auto h-[320px] w-full">
        <BarChart accessibilityLayer data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="sede"
            tickLine={false}
            tickMargin={10}
            axisLine={false}
            interval={0}
            angle={inclinar ? -40 : 0}
            textAnchor={inclinar ? "end" : "middle"}
            height={inclinar ? 64 : 30}
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
    </div>
  );
}
