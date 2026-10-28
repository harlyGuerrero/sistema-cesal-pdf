import { describe, expect, it } from "vitest";
import { narrarAuditoria } from "@/lib/auditoria/narrativa";
import { buildAuditoriaWhere } from "@/lib/auditoria/filtros";

// Detalles reales de la base de desarrollo (20/10/2026) y las formas que
// escribe cada acción auditada del código.
describe("registros reales", () => {
  it("alta de activo", () => {
    const n = narrarAuditoria(
      "Activo",
      "DAR_DE_ALTA",
      { sede: "Huachipa", tipo: "Equipos informáticos", nombreActivo: "LECTOR CODIGO BARRAS", codigoPatrimonial: "INF-LE-26-0001" },
      "act1"
    );
    expect(n.titulo).toBe("Registró un activo nuevo");
    expect(n.objeto).toEqual({ tipo: "Activo", nombre: "LECTOR CODIGO BARRAS", codigo: "INF-LE-26-0001", activoId: "act1" });
    expect(n.resumen).toEqual(["Equipos informáticos · sede Huachipa"]);
  });

  it("asignación", () => {
    const n = narrarAuditoria("Activo", "ASIGNAR", { responsable: "Sergio", nombreActivo: "LECTOR CODIGO BARRAS", codigoPatrimonial: "INF-LE-26-0001" }, "act1");
    expect(n.titulo).toBe("Asignó un activo a Sergio");
  });

  it("edición de activo: dice que no se guardó qué cambió", () => {
    const n = narrarAuditoria("Activo", "ACTUALIZAR", { nombreActivo: "LECTOR CODIGO BARRAS", codigoPatrimonial: "INF-LE-26-0001" }, "act1");
    expect(n.titulo).toBe("Editó los datos de un activo");
    expect(n.resumen).toEqual(["El registro no guarda qué datos cambiaron."]);
  });

  it("procesamiento de depreciación", () => {
    const n = narrarAuditoria(
      "ProcesamientoDepreciacion",
      "PROCESAR_DEPRECIACION",
      { periodo: "4T 2026", omitidos: 0, conErrores: 0, importeTotal: "80.00", yaProcesados: 0, activosProcesados: 1, periodosRegistrados: 4 },
      "p1"
    );
    expect(n.titulo).toBe("Procesó la depreciación hasta el 4T 2026");
    expect(n.resumen).toEqual(["4 periodos registrados en 1 activo · S/ 80,00"]);
    expect(n.detalles.find((d) => d.label === "Importe depreciado")?.value).toBe("S/ 80,00");
    expect(n.objeto.activoId).toBeNull();
  });
});

describe("otras acciones del sistema", () => {
  it("retiro de asignación", () => {
    const n = narrarAuditoria(
      "Activo",
      "ACTUALIZAR",
      { motivo: "desasignar_responsable", nombreActivo: "Laptop", codigoPatrimonial: "INF-LA-26-0003", responsableAnterior: "Rosa Huamán" },
      "a2"
    );
    expect(n.titulo).toBe("Retiró la asignación de un activo a Rosa Huamán");
    expect(n.detalles.some((d) => d.label === "motivo" || d.label === "Motivo")).toBe(false);
  });

  it("alta desde Excel y desde factura", () => {
    expect(narrarAuditoria("Activo", "DAR_DE_ALTA", { origen: "excel" }, "a").titulo).toBe("Registró un activo desde Excel");
    expect(narrarAuditoria("Activo", "DAR_DE_ALTA", { origen: "pdf" }, "a").titulo).toBe("Registró un activo desde una factura");
  });

  it("documento adjunto enlaza al activo del detalle, no al documento", () => {
    const n = narrarAuditoria(
      "Documento",
      "ADJUNTAR_DOCUMENTO",
      { activoId: "a9", activoNombre: "Impresora", codigoPatrimonial: "OFF-IM-26-0002", tipoDocumento: "FACTURA", nombreOriginal: "factura.pdf" },
      "doc1"
    );
    expect(n.titulo).toBe("Adjuntó un documento a Impresora (OFF-IM-26-0002)");
    expect(n.objeto).toMatchObject({ tipo: "Documento", nombre: "factura.pdf", activoId: "a9" });
  });

  it("cuenta de usuario con rol y estado legibles", () => {
    const n = narrarAuditoria("Usuario", "ACTUALIZAR", { nombre: "Ana Quispe", email: "ana@cesal.org", rol: "ADMIN", estado: false }, "u1");
    expect(n.titulo).toBe("Actualizó una cuenta de usuario");
    expect(n.resumen).toEqual(["Administrador · cuenta desactivada"]);
    expect(n.detalles).toContainEqual({ label: "Rol", value: "Administrador" });
  });

  it("combinación desconocida: dice la acción sin inventar", () => {
    const n = narrarAuditoria("Otra", "CREAR", null, "x");
    expect(n.titulo).toBe("Crear (otra)");
    expect(n.detalles).toEqual([]);
  });
});

describe("búsqueda de auditoría", () => {
  it("busca por usuario y por nombre o código del registro, en mayúsculas también", () => {
    const where = buildAuditoriaWhere({ q: "inf-le" });
    const json = JSON.stringify(where);
    expect(json).toContain('"path":["codigoPatrimonial"],"string_contains":"INF-LE"');
    expect(json).toContain('"path":["nombreActivo"],"string_contains":"inf-le"');
    expect(json).toContain('"nombres":{"contains":"inf-le","mode":"insensitive"}');
  });

  it("filtra por usuario", () => {
    expect(buildAuditoriaWhere({ usuarioId: "u1" })).toEqual({ AND: [{ usuarioId: "u1" }] });
    expect(buildAuditoriaWhere({ usuarioId: "all" })).toEqual({});
  });
});
