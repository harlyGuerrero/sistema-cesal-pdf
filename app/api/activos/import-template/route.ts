import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildActivoImportTemplateWorkbook } from "@/lib/activos/excel-template";

export const runtime = "nodejs";

export async function GET() {
  const [tiposActivo, sedes] = await Promise.all([
    prisma.tipoActivo.findMany({ orderBy: { name: "asc" } }),
    prisma.sede.findMany({ orderBy: { name: "asc" } }),
  ]);

  const buffer = await buildActivoImportTemplateWorkbook({
    tiposActivo: tiposActivo.map((t) => t.name),
    sedes: sedes.map((s) => s.name),
  });

  // Cast: exceljs declara su propio `Buffer` global incompatible con
  // @types/node (ver excel-import.ts) — en runtime es un Buffer real, válido
  // como BodyInit.
  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="plantilla-importar-activos.xlsx"`,
    },
  });
}
