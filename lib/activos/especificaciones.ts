import type { CampoEspecificacion } from "@/lib/generated/prisma/client";

export interface EspecificacionInput {
  campoId: string;
  valorTexto?: string;
  valorNumero?: number;
  valorFecha?: Date;
  valorBooleano?: boolean;
  valorCatalogoValorId?: string;
}

// Fase 6 de Activos: lee del FormData el valor de cada CampoEspecificacion de
// la subcategoría elegida (input `campo_<id>`), valida obligatoriedad y
// arma la fila tipada correspondiente al tipoDato — solo la columna que
// corresponde se llena (ver ActivoEspecificacionValor en schema.prisma). Un
// campo opcional sin valor no genera fila.
export function readEspecificaciones(
  campos: Pick<CampoEspecificacion, "id" | "nombre" | "tipoDato" | "obligatorio">[],
  formData: FormData
): EspecificacionInput[] {
  const resultado: EspecificacionInput[] = [];

  for (const campo of campos) {
    const raw = (formData.get(`campo_${campo.id}`) as string | null)?.trim() ?? "";

    if (!raw) {
      if (campo.obligatorio) {
        throw new Error(`El campo "${campo.nombre}" es obligatorio.`);
      }
      continue;
    }

    switch (campo.tipoDato) {
      case "TEXTO":
      case "URL":
        resultado.push({ campoId: campo.id, valorTexto: raw });
        break;
      case "NUMERO_ENTERO":
      case "NUMERO_DECIMAL": {
        const numero = Number(raw);
        if (!Number.isFinite(numero)) {
          throw new Error(`El campo "${campo.nombre}" debe ser un número.`);
        }
        resultado.push({ campoId: campo.id, valorNumero: numero });
        break;
      }
      case "FECHA": {
        const fecha = new Date(raw);
        if (Number.isNaN(fecha.getTime())) {
          throw new Error(`El campo "${campo.nombre}" debe ser una fecha válida.`);
        }
        resultado.push({ campoId: campo.id, valorFecha: fecha });
        break;
      }
      case "BOOLEANO":
        resultado.push({ campoId: campo.id, valorBooleano: raw === "true" });
        break;
      case "SELECCION":
      case "CATALOGO":
        resultado.push({ campoId: campo.id, valorCatalogoValorId: raw });
        break;
    }
  }

  return resultado;
}
