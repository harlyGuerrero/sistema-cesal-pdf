import "dotenv/config";
import { prisma } from "../lib/db";
import { sincronizarValoresContables } from "../lib/depreciacion/valores-contables";

// Fase 60: pone el valor contable y el valor actual de los activos que ya
// existían antes de que se calcularan solos (ver
// lib/depreciacion/valores-contables.ts). Desde Fase 60 se mantienen al
// crear, editar, importar o procesar un trimestre; este script solo hace
// falta una vez por base. Idempotente: un activo que ya tiene el valor
// correcto no se toca, y los que no tienen la depreciación definida quedan
// como estaban. Uso: npm run sincronizar-valores.
async function main() {
  const ids = (await prisma.activo.findMany({ select: { id: true } })).map((activo) => activo.id);
  const actualizados = await prisma.$transaction((tx) => sincronizarValoresContables(tx, ids), { timeout: 120_000 });
  console.log(`Activos revisados: ${ids.length}. Actualizados: ${actualizados}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
