import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, CategoryCode } from "../lib/generated/prisma/client";

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

async function main() {
  for (const category of CATEGORIES) {
    await prisma.category.upsert({
      where: { code: category.code },
      update: { name: category.name },
      create: category,
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
