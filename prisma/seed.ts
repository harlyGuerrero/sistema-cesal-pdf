import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, CategoryCode, Region } from "../lib/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Categorías patrimoniales cerradas (ver ARCHITECTURE.md 5.2). No agregar OTROS.
const CATEGORIES: { code: CategoryCode; name: string }[] = [
  { code: CategoryCode.EQUIPOS_INFORMATICOS, name: "Equipos Informáticos" },
  { code: CategoryCode.EQUIPOS_DE_OFICINA, name: "Equipos de Oficina" },
  { code: CategoryCode.MUEBLES_DE_OFICINA, name: "Muebles de Oficina" },
  { code: CategoryCode.BIENES_VEHICULARES, name: "Bienes Vehiculares" },
  { code: CategoryCode.EQUIPOS_DE_MAQUINARIA, name: "Equipos de Maquinaria" },
  { code: CategoryCode.BIENES_INMUEBLES, name: "Bienes Inmuebles" },
];

// Sedes reales de la organización (Fase B). Cuando una ciudad no tiene
// sub-sedes propias (Sierra/Selva), la sede toma el nombre de la ciudad.
const SEDES: { name: string; city: string; region: Region }[] = [
  { name: "Sede Principal", city: "San Isidro", region: Region.COSTA },
  { name: "CAE - Huachipa", city: "Huachipa", region: Region.COSTA },
  { name: "AYTO - Huachipa", city: "Huachipa", region: Region.COSTA },
  { name: "OIM - Huachipa", city: "Huachipa", region: Region.COSTA },
  { name: "CETPRO - Huachipa", city: "Huachipa", region: Region.COSTA },
  { name: "SIRAY WASI", city: "Huachipa", region: Region.COSTA },
  { name: "Abancay", city: "Abancay", region: Region.SIERRA },
  { name: "Andahuaylas", city: "Andahuaylas", region: Region.SIERRA },
  { name: "Apurímac", city: "Apurímac", region: Region.SIERRA },
  { name: "Atalaya", city: "Atalaya", region: Region.SELVA },
];

async function main() {
  for (const category of CATEGORIES) {
    await prisma.category.upsert({
      where: { code: category.code },
      update: { name: category.name },
      create: category,
    });
  }

  for (const sede of SEDES) {
    await prisma.sede.upsert({
      where: { name: sede.name },
      update: { city: sede.city, region: sede.region },
      create: sede,
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
