import "dotenv/config";
import { prisma } from "../lib/db";
import { formatearCodigoPatrimonial } from "../lib/activos/codigo-patrimonial";
import type { TipoActivoCode } from "../lib/generated/prisma/client";

// Fase 16: migración única de codigoPatrimonial al esquema
// PREFIJO-AB-AA-NNNN (ver lib/activos/codigo-patrimonial.ts). Reasigna TODOS
// los activos existentes, incluidos los que ya tenían un código en otro
// formato (ej. "PROSA-465") — decisión explícita del usuario, no solo
// completar los que estaban vacíos.
//
// Orden: por createdAt ascendente, agrupado por (tipoActivo.code, año de
// createdAt) — mismo criterio que usará el sistema de aquí en adelante, así
// el correlativo queda continuo entre lo migrado y lo nuevo. Al final deja
// CodigoPatrimonialContador con el último número usado por grupo, para que
// el próximo Activo real siga la cuenta sin colisionar.
//
// Uso: npx tsx scripts/migrar-codigos-patrimoniales.ts        (dry-run, no escribe nada)
//      npx tsx scripts/migrar-codigos-patrimoniales.ts --apply (aplica los cambios)

async function main() {
  const apply = process.argv.includes("--apply");

  const activos = await prisma.activo.findMany({
    select: {
      id: true,
      nombreActivo: true,
      codigoPatrimonial: true,
      createdAt: true,
      tipoActivo: { select: { code: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const contadores = new Map<string, number>(); // "CODE-anio" -> último usado
  const cambios: { id: string; nombreActivo: string; anterior: string | null; nuevo: string }[] = [];

  for (const activo of activos) {
    const anio = activo.createdAt.getFullYear();
    const clave = `${activo.tipoActivo.code}-${anio}`;
    const correlativo = (contadores.get(clave) ?? 0) + 1;
    contadores.set(clave, correlativo);

    const nuevo = formatearCodigoPatrimonial({
      tipoActivoCode: activo.tipoActivo.code,
      nombreActivo: activo.nombreActivo,
      anio,
      correlativo,
    });

    cambios.push({ id: activo.id, nombreActivo: activo.nombreActivo, anterior: activo.codigoPatrimonial, nuevo });
  }

  console.log(`${apply ? "APLICANDO" : "DRY-RUN (sin --apply, no escribe nada)"} — ${cambios.length} activos:\n`);
  for (const c of cambios) {
    console.log(`  ${(c.anterior ?? "(sin código)").padEnd(16)} -> ${c.nuevo.padEnd(16)} | ${c.nombreActivo}`);
  }

  if (!apply) {
    console.log("\nRevisa el mapeo de arriba. Para aplicar de verdad: npx tsx scripts/migrar-codigos-patrimoniales.ts --apply");
    await prisma.$disconnect();
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const c of cambios) {
      await tx.activo.update({ where: { id: c.id }, data: { codigoPatrimonial: c.nuevo } });
    }
    for (const [clave, ultimo] of contadores) {
      const [tipoActivoCode, anioStr] = clave.split("-");
      const anio = Number(anioStr);
      await tx.codigoPatrimonialContador.upsert({
        where: { tipoActivoCode_anio: { tipoActivoCode: tipoActivoCode as TipoActivoCode, anio } },
        create: { tipoActivoCode: tipoActivoCode as TipoActivoCode, anio, ultimo },
        update: { ultimo },
      });
    }
  });

  console.log("\nMigración aplicada. Contadores actualizados:");
  for (const [clave, ultimo] of contadores) {
    console.log(`  ${clave}: último = ${ultimo}`);
  }

  await prisma.$disconnect();
}

main();
