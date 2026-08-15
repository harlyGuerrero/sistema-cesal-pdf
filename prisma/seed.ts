import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, TipoActivoCode, Region } from "../lib/generated/prisma/client";
import { slugify } from "../lib/activos/slug";

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

// Taxonomía inicial (Fase 3 de Activos, planificación §5): Categoría ->
// Subcategoría por tipo de activo. Bienes Inmuebles queda con menos detalle
// a propósito — la hoja original tiene muy pocos registros y CESAL todavía
// no validó esos campos (ver planificación de Activos, decisiones abiertas).
const TAXONOMIA: {
  tipoCode: TipoActivoCode;
  categorias: { nombre: string; subcategorias: string[] }[];
}[] = [
  {
    tipoCode: TipoActivoCode.EQUIPOS_INFORMATICOS,
    categorias: [
      { nombre: "Computación", subcategorias: ["Laptop", "PC de escritorio", "CPU", "Tablet"] },
      {
        nombre: "Impresión",
        subcategorias: ["Impresora", "Impresora de tinta", "Impresora láser", "Impresora multifuncional"],
      },
      { nombre: "Redes y conectividad", subcategorias: ["Router", "Switch", "Módem"] },
      { nombre: "Visualización", subcategorias: ["Monitor", "Proyector"] },
      { nombre: "Captura", subcategorias: ["Cámara digital", "Lector de código de barras"] },
      { nombre: "Energía y protección", subcategorias: ["Estabilizador"] },
    ],
  },
  {
    tipoCode: TipoActivoCode.BIENES_VEHICULARES,
    categorias: [
      { nombre: "Vehículos terrestres", subcategorias: ["Camioneta", "Motocicleta"] },
      { nombre: "Embarcaciones", subcategorias: ["Bote", "Embarcación fluvial"] },
      { nombre: "Motores", subcategorias: ["Motor fuera de borda", "Motor Peke Peke"] },
    ],
  },
  {
    tipoCode: TipoActivoCode.MUEBLES_DE_OFICINA,
    categorias: [
      {
        nombre: "Almacenamiento",
        subcategorias: ["Archivador", "Armario", "Estante", "Librero", "Gabinete", "Organizador"],
      },
      { nombre: "Mesas y superficies", subcategorias: ["Escritorio", "Mesa", "Mesa pequeña"] },
      { nombre: "Asientos", subcategorias: ["Silla", "Sillón", "Banqueta", "Banca"] },
      { nombre: "Exhibición y apoyo", subcategorias: ["Atril", "Exhibidor", "Pizarra", "Ecran"] },
      { nombre: "Complementos", subcategorias: ["Biombo", "Espejo", "Repostero", "Lavadero"] },
      { nombre: "Otros", subcategorias: ["Carreta", "Escalera", "Toldo", "Carpa"] },
    ],
  },
  {
    tipoCode: TipoActivoCode.EQUIPOS_DE_OFICINA,
    categorias: [
      { nombre: "Climatización", subcategorias: ["Aire acondicionado", "Ventilador", "Calefactor"] },
      {
        nombre: "Cocina y alimentación",
        subcategorias: ["Cafetera", "Cocina", "Hervidor", "Microondas", "Frigobar", "Dispensador de agua"],
      },
      {
        nombre: "Audio",
        subcategorias: ["Amplificador", "Caja acústica", "Equipo de sonido", "Megáfono", "Micrófono", "Parlante"],
      },
      { nombre: "Comunicación", subcategorias: ["Teléfono"] },
      { nombre: "Visualización", subcategorias: ["Pizarra", "Pizarra acrílica", "Ecran"] },
      { nombre: "Seguridad", subcategorias: ["Extintor", "Gabinete para extintor", "Sistema de videovigilancia"] },
      { nombre: "Iluminación", subcategorias: ["Luz de emergencia", "Reflector"] },
      { nombre: "Agua", subcategorias: ["Purificador de agua"] },
    ],
  },
  {
    tipoCode: TipoActivoCode.EQUIPOS_DE_MAQUINARIA,
    categorias: [
      {
        nombre: "Maquinaria textil",
        subcategorias: [
          "Máquina de costura",
          "Remalladora",
          "Recubridora",
          "Bordadora",
          "Botonera",
          "Ojaladora",
          "Elasticadora",
          "Collaretera",
        ],
      },
      {
        nombre: "Equipos de cocina",
        subcategorias: ["Horno", "Cocina industrial", "Batidora", "Licuadora", "Cortador de masa", "Campana extractora"],
      },
      { nombre: "Refrigeración", subcategorias: ["Refrigeradora", "Congeladora"] },
      { nombre: "Pesaje", subcategorias: ["Balanza"] },
      { nombre: "Manipulación", subcategorias: ["Transpaleta hidráulica"] },
    ],
  },
  {
    tipoCode: TipoActivoCode.BIENES_INMUEBLES,
    categorias: [
      { nombre: "Terrenos", subcategorias: [] },
      { nombre: "Edificaciones", subcategorias: ["Oficina", "Local", "Centro de atención"] },
      { nombre: "Otros inmuebles", subcategorias: [] },
    ],
  },
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

  for (const { tipoCode, categorias } of TAXONOMIA) {
    const tipoActivo = await prisma.tipoActivo.findUniqueOrThrow({ where: { code: tipoCode } });

    for (const categoria of categorias) {
      const categoriaSlug = slugify(categoria.nombre);
      const categoriaRow = await prisma.categoriaActivo.upsert({
        where: { tipoActivoId_slug: { tipoActivoId: tipoActivo.id, slug: categoriaSlug } },
        update: { nombre: categoria.nombre },
        create: { tipoActivoId: tipoActivo.id, nombre: categoria.nombre, slug: categoriaSlug },
      });

      for (const subcategoriaNombre of categoria.subcategorias) {
        const subcategoriaSlug = slugify(subcategoriaNombre);
        await prisma.subcategoriaActivo.upsert({
          where: { categoriaId_slug: { categoriaId: categoriaRow.id, slug: subcategoriaSlug } },
          update: { nombre: subcategoriaNombre },
          create: { categoriaId: categoriaRow.id, nombre: subcategoriaNombre, slug: subcategoriaSlug },
        });
      }
    }
  }

  // Catálogo de ejemplo (Fase 4 de Activos). Lista ilustrativa del encargo
  // original, no una lista de marcas confirmada por CESAL -- se completa al
  // migrar el inventario real.
  const marcaCatalogo = await prisma.catalogo.upsert({
    where: { codigo: "MARCA" },
    update: {},
    create: { codigo: "MARCA", nombre: "Marca" },
  });
  for (const valor of ["Lenovo", "HP", "Dell"]) {
    await prisma.catalogoValor.upsert({
      where: { catalogoId_valor: { catalogoId: marcaCatalogo.id, valor } },
      update: {},
      create: { catalogoId: marcaCatalogo.id, valor },
    });
  }

  // Campos de ejemplo bajo Laptop, para demostrar el flujo completo de
  // campos dinámicos -- no se siembran los campos de las otras ~90
  // subcategorías, eso queda para cuando se construya el formulario real
  // de Activo (Fase 6) y se valide con CESAL qué campos usar en cada una.
  const laptop = await prisma.subcategoriaActivo.findFirstOrThrow({ where: { slug: "laptop" } });
  const CAMPOS_LAPTOP: {
    nombre: string;
    etiqueta: string;
    tipoDato: "TEXTO" | "NUMERO_ENTERO" | "CATALOGO";
    unidad?: string;
    catalogoId?: string;
  }[] = [
    { nombre: "Marca", etiqueta: "Marca", tipoDato: "CATALOGO", catalogoId: marcaCatalogo.id },
    { nombre: "N° de serie", etiqueta: "N° de serie", tipoDato: "TEXTO" },
    { nombre: "Memoria RAM", etiqueta: "Memoria RAM", tipoDato: "NUMERO_ENTERO", unidad: "GB" },
  ];
  for (const campo of CAMPOS_LAPTOP) {
    await prisma.campoEspecificacion.upsert({
      where: { subcategoriaId_nombre: { subcategoriaId: laptop.id, nombre: campo.nombre } },
      update: {},
      create: { subcategoriaId: laptop.id, ...campo },
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
