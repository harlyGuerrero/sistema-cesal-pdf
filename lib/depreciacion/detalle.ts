import { nombreCompleto } from "@/lib/nombre-completo";
import type { Prisma } from "@/lib/generated/prisma/client";
import {
  agregarHistorial,
  resumirDepreciacion,
  type RegistroDepreciacion,
  type ResumenDepreciacion,
} from "./calculo";
import { cargarTasasPorTipo, toActivoDepreciable, toRegistroDepreciacion } from "./consultas";

// Fase 58: depreciación de un solo activo, para su detalle y su ficha. Usa
// agregarHistorial + resumirDepreciacion — el mismo resumen que el módulo
// general arma desde el GROUP BY, así el valor neto coincide en ambos lados.

export interface PeriodoHistorial extends RegistroDepreciacion {
  id: string;
  registradoEn: Date;
  usuario: string | null;
}

export interface DepreciacionActivo {
  resumen: ResumenDepreciacion;
  fechaAdquisicion: Date | null;
  tipoActivo: string;
  ultimoRegistroEn: Date | null;
  historial: PeriodoHistorial[];
}

export async function cargarDepreciacionActivo(
  client: Prisma.TransactionClient,
  activoId: string,
  ahora: Date = new Date()
): Promise<DepreciacionActivo | null> {
  const [activo, tasas] = await Promise.all([
    client.activo.findUnique({
      where: { id: activoId },
      select: {
        tipoActivoId: true,
        tipoActivo: { select: { name: true } },
        costoAdquisicion: true,
        fechaAdquisicion: true,
        estadoPatrimonial: true,
        depreciaciones: {
          orderBy: [{ anio: "asc" }, { trimestre: "asc" }],
          include: { procesamiento: { select: { usuario: { select: { nombres: true, apellidos: true } } } } },
        },
      },
    }),
    cargarTasasPorTipo(client),
  ]);
  if (!activo) return null;

  const historial: PeriodoHistorial[] = activo.depreciaciones.map((fila) => ({
    ...toRegistroDepreciacion(fila),
    id: fila.id,
    registradoEn: fila.createdAt,
    usuario: fila.procesamiento.usuario ? nombreCompleto(fila.procesamiento.usuario) : null,
  }));

  return {
    resumen: resumirDepreciacion(toActivoDepreciable(activo, tasas), agregarHistorial(historial), ahora),
    fechaAdquisicion: activo.fechaAdquisicion,
    tipoActivo: activo.tipoActivo.name,
    ultimoRegistroEn: historial.at(-1)?.registradoEn ?? null,
    historial,
  };
}
