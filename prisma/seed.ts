import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, TipoActivoCode, Region } from "../lib/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Los 6 tipos de activo patrimonial, cerrados (ver ARCHITECTURE.md 5.2). No agregar OTROS.
const TIPOS_ACTIVO: { code: TipoActivoCode; name: string }[] = [
  { code: TipoActivoCode.EQUIPOS_INFORMATICOS, name: "Equipos Informáticos" },
  { code: TipoActivoCode.EQUIPOS_DE_OFICINA, name: "Equipos de Oficina" },
  { code: TipoActivoCode.MUEBLES_DE_OFICINA, name: "Muebles de Oficina" },
  { code: TipoActivoCode.BIENES_VEHICULARES, name: "Bienes Vehiculares" },
  { code: TipoActivoCode.EQUIPOS_DE_MAQUINARIA, name: "Equipos de Maquinaria" },
  { code: TipoActivoCode.BIENES_INMUEBLES, name: "Bienes Inmuebles" },
];

// Sedes reales de la organización, a nivel ciudad (Fase 5 de Activos).
// Abancay/Andahuaylas/Apurímac/Atalaya todavía no tienen unidad operativa
// propia definida por CESAL — no se inventa una para rellenar el hueco.
const SEDES: { name: string; region: Region }[] = [
  { name: "San Isidro", region: Region.COSTA },
  { name: "Huachipa", region: Region.COSTA },
  { name: "Abancay", region: Region.SIERRA },
  { name: "Andahuaylas", region: Region.SIERRA },
  { name: "Apurímac", region: Region.SIERRA },
  { name: "Atalaya", region: Region.SELVA },
];

// Unidades operativas reales, cada una bajo su sede (ciudad).
const UNIDADES_OPERATIVAS: { sedeName: string; name: string }[] = [
  { sedeName: "San Isidro", name: "Sede Principal" },
  { sedeName: "Huachipa", name: "CAE - Huachipa" },
  { sedeName: "Huachipa", name: "AYTO - Huachipa" },
  { sedeName: "Huachipa", name: "OIM - Huachipa" },
  { sedeName: "Huachipa", name: "CETPRO - Huachipa" },
  { sedeName: "Huachipa", name: "SIRAY WASI" },
];

async function main() {
  for (const tipoActivo of TIPOS_ACTIVO) {
    await prisma.tipoActivo.upsert({
      where: { code: tipoActivo.code },
      update: { name: tipoActivo.name },
      create: tipoActivo,
    });
  }

  for (const sede of SEDES) {
    await prisma.sede.upsert({
      where: { name: sede.name },
      update: { region: sede.region },
      create: sede,
    });
  }

  for (const unidad of UNIDADES_OPERATIVAS) {
    const sede = await prisma.sede.findUniqueOrThrow({ where: { name: unidad.sedeName } });
    await prisma.unidadOperativa.upsert({
      where: { sedeId_name: { sedeId: sede.id, name: unidad.name } },
      update: {},
      create: { sedeId: sede.id, name: unidad.name },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
