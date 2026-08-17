import { NextResponse } from "next/server";
import { getSessionUsuario } from "@/lib/auth/session";
import { validateExcelUpload, ExcelValidationError } from "@/lib/security/excel-validation";
import { parseActivosWorkbook, commitActivosImport, ExcelImportError } from "@/lib/activos/excel-import";

export const runtime = "nodejs";

// Fase 40: dos modos sobre el mismo endpoint en vez de dos rutas, porque
// ambos comparten exactamente el mismo parseo/validación — "preview" solo
// lee (para mostrar la vista previa antes de confirmar), "commit" además
// escribe. El archivo se vuelve a mandar en el segundo llamado (no queda
// nada "en espera" en el servidor entre preview y commit) — reparsear un
// .xlsx de a lo sumo unos miles de filas es barato.
export async function POST(request: Request) {
  const usuario = await getSessionUsuario();
  if (!usuario) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Cuerpo de la petición inválido, se esperaba multipart/form-data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo 'file'" }, { status: 400 });
  }
  const mode = formData.get("mode");
  if (mode !== "preview" && mode !== "commit") {
    return NextResponse.json({ error: "Falta 'mode' (preview|commit)" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    validateExcelUpload(file.name, file.type, buffer);
    const preview = await parseActivosWorkbook(buffer);

    if (mode === "preview") {
      return NextResponse.json({
        totalFilas: preview.totalFilas,
        crear: preview.crear,
        actualizar: preview.actualizar,
        conError: preview.conError,
        filas: preview.filas.map((fila) =>
          fila.status === "ok"
            ? {
                rowNumber: fila.rowNumber,
                status: fila.status,
                action: fila.action,
                nombreActivo: fila.nombreActivo,
                codigoPatrimonial: fila.codigoPatrimonial,
                resumen: fila.resumen,
              }
            : fila
        ),
      });
    }

    const resultado = await commitActivosImport(preview.filas, usuario.id);
    return NextResponse.json({
      creados: resultado.creados,
      actualizados: resultado.actualizados,
      omitidos: preview.conError,
    });
  } catch (error) {
    if (error instanceof ExcelValidationError || error instanceof ExcelImportError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
