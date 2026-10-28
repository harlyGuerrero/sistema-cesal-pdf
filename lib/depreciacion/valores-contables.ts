import type { Prisma } from "@/lib/generated/prisma/client";
import { centavosATexto, parseCentavos, resumirDepreciacion, valorContableCalculado } from "./calculo";
import { cargarHistorialesAgregados, cargarTasasPorTipo, historialDe, toActivoDepreciable } from "./consultas";

// Fase 60: guarda en Activo.valorContable y Activo.valorActual el valor neto
// contable de los activos cuya depreciación está definida (ver
// valorContableCalculado). Se llama dentro de la misma transacción que
// cambia lo que lo determina: alta y edición del activo, importación de
// Excel y procesamiento de un trimestre. Los activos sin depreciación
// definida no se tocan: ahí los dos valores siguen siendo manuales.
// Devuelve cuántos activos actualizó.
export async function sincronizarValoresContables(
  tx: Prisma.TransactionClient,
  activoIds: string[]
): Promise<number> {
  if (activoIds.length === 0) return 0;

  const [activos, tasas, historiales] = await Promise.all([
    tx.activo.findMany({
      where: { id: { in: activoIds } },
      select: {
        id: true,
        tipoActivoId: true,
        costoAdquisicion: true,
        fechaAdquisicion: true,
        estadoPatrimonial: true,
        valorContable: true,
        valorActual: true,
      },
    }),
    cargarTasasPorTipo(tx),
    cargarHistorialesAgregados(tx, { activoIds }),
  ]);

  let actualizados = 0;
  for (const activo of activos) {
    const valor = valorContableCalculado(
      resumirDepreciacion(toActivoDepreciable(activo, tasas), historialDe(historiales, activo.id))
    );
    if (valor === null) continue;
    if (parseCentavos(activo.valorContable) === valor && parseCentavos(activo.valorActual) === valor) continue;
    const texto = centavosATexto(valor);
    await tx.activo.update({ where: { id: activo.id }, data: { valorContable: texto, valorActual: texto } });
    actualizados++;
  }
  return actualizados;
}
