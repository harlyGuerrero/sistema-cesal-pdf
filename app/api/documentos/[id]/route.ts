import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { leerDocumento } from "@/lib/documentos/storage";

export const runtime = "nodejs";

// Fase 10 de Activos: único punto de descarga — el archivo nunca se sirve
// por ruta directa (document-storage/ no está en public/, ver
// lib/documentos/storage.ts). Un documento "eliminado" (soft-delete) no se
// puede descargar, aunque el archivo siga existiendo en disco.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const documento = await prisma.documento.findUnique({ where: { id } });

  if (!documento || !documento.estado) {
    return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
  }

  let buffer: Buffer;
  try {
    buffer = await leerDocumento(documento.activoId, documento.url);
  } catch {
    return NextResponse.json({ error: "El archivo no está disponible" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": documento.mimeType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(documento.nombreOriginal)}"`,
      "Content-Length": String(buffer.length),
    },
  });
}
