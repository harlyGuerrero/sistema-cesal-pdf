import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getSessionUsuario } from "@/lib/auth/session";
import { subirDocumento, SubidaDocumentoError } from "@/lib/documentos/subir";

export const runtime = "nodejs";

// Fase 63: subida de un documento por archivo. Es una API route y no un
// server action para que el navegador pueda informar el progreso
// (XMLHttpRequest.upload) y para no chocar con el límite de 1 MB del body de
// los server actions — los documentos aceptan hasta 20 MB.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const usuario = await getSessionUsuario();
  if (!usuario) {
    return NextResponse.json({ error: "Sesión expirada. Vuelve a iniciar sesión." }, { status: 401 });
  }

  const { id: activoId } = await params;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "No se pudo leer el archivo enviado." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Selecciona un archivo." }, { status: 400 });
  }

  try {
    const documento = await subirDocumento({
      activoId,
      usuarioId: usuario.id,
      file,
      tipoDocumento: (formData.get("tipoDocumento") as string | null) ?? "",
      descripcion: (formData.get("descripcion") as string | null)?.trim() || null,
    });
    revalidatePath(`/activos/${activoId}`);
    revalidatePath(`/activos/${activoId}/ficha`);
    return NextResponse.json(documento, { status: 201 });
  } catch (error) {
    if (error instanceof SubidaDocumentoError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Error al subir documento", error);
    return NextResponse.json({ error: "No se pudo guardar el archivo." }, { status: 500 });
  }
}
