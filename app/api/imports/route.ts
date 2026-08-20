import { NextResponse } from "next/server";
import { processUpload } from "@/lib/import-workflow/process-upload";
import { PdfValidationError } from "@/lib/security/pdf-validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
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

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const result = await processUpload({
      buffer,
      filename: file.name,
      mimeType: file.type,
    });

    if (result.outcome === "duplicate") {
      return NextResponse.json(
        { status: "duplicate", importId: result.importId },
        { status: 409 }
      );
    }

    if (result.outcome === "failed") {
      return NextResponse.json(
        { status: "failed", importId: result.importId, error: result.error },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { status: "processed", importId: result.importId, itemCount: result.itemCount },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof PdfValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
