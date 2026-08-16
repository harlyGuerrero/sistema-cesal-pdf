"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CONDICION_FISICA_OPTIONS, ESTADO_PATRIMONIAL_OPTIONS } from "@/lib/activos/labels";
import { CampoEspecificacionInput, type CampoEspecificacionOption } from "./campo-especificacion-input";
import { createActivoAction, updateActivoAction } from "./actions";

export interface TipoActivoTree {
  id: string;
  name: string;
  categorias: {
    id: string;
    nombre: string;
    subcategorias: { id: string; nombre: string; campos: CampoEspecificacionOption[] }[];
  }[];
}

export interface SedeOption {
  id: string;
  name: string;
  unidadesOperativas: { id: string; name: string }[];
  ambientes: { id: string; name: string; unidadOperativaId: string | null }[];
}

export interface ActivoFormInitial {
  nombreActivo: string;
  descripcion: string;
  subcategoriaId: string;
  codigoPatrimonial: string;
  sedeId: string;
  unidadOperativaId: string;
  ambienteId: string;
  proveedorRazonSocial: string;
  fechaAdquisicion: string;
  numeroFactura: string;
  codigoProyecto: string;
  costoAdquisicion: string;
  valorContable: string;
  valorActual: string;
  estadoPatrimonial: string;
  condicionFisica: string;
  observaciones: string;
  especificaciones: Record<string, string>;
}

const SIN_SELECCION = "__ninguno__";

function isNextRedirectError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof error.digest === "string" &&
    error.digest.startsWith("NEXT_REDIRECT")
  );
}

function flattenSubcategorias(tiposActivo: TipoActivoTree[]) {
  return tiposActivo.flatMap((tipo) =>
    tipo.categorias.flatMap((categoria) =>
      categoria.subcategorias.map((subcategoria) => ({
        ...subcategoria,
        tipoActivoNombre: tipo.name,
        categoriaNombre: categoria.nombre,
      }))
    )
  );
}

// Fase 6 de Activos: formulario único para alta y edición. Integra la
// ubicación en cascada (Sede -> Unidad Operativa -> Ambiente, Fase 5) y los
// campos dinámicos de la subcategoría elegida (Fase 4) — sin código nuevo
// por subcategoría, el listado de campos viene de CampoEspecificacion.
export function ActivoForm({
  activoId,
  initial,
  tiposActivo,
  sedes,
}: {
  activoId?: string;
  initial?: ActivoFormInitial;
  tiposActivo: TipoActivoTree[];
  sedes: SedeOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [subcategoriaId, setSubcategoriaId] = useState(initial?.subcategoriaId ?? "");
  const [sedeId, setSedeId] = useState(initial?.sedeId ?? "");
  const [unidadOperativaId, setUnidadOperativaId] = useState(initial?.unidadOperativaId || SIN_SELECCION);

  const subcategorias = flattenSubcategorias(tiposActivo);
  const subcategoriaSeleccionada = subcategorias.find((s) => s.id === subcategoriaId);

  const sedeSeleccionada = sedes.find((s) => s.id === sedeId);
  const unidadesDisponibles = sedeSeleccionada?.unidadesOperativas ?? [];
  const ambientesDisponibles = (sedeSeleccionada?.ambientes ?? []).filter(
    (ambiente) =>
      unidadOperativaId === SIN_SELECCION ||
      ambiente.unidadOperativaId === null ||
      ambiente.unidadOperativaId === unidadOperativaId
  );

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    for (const key of ["unidadOperativaId", "ambienteId", "condicionFisica"]) {
      if (formData.get(key) === SIN_SELECCION) formData.set(key, "");
    }

    startTransition(async () => {
      try {
        if (activoId) {
          await updateActivoAction(activoId, formData);
          toast.success("Activo actualizado.");
          router.push(`/activos/${activoId}`);
        } else {
          await createActivoAction(formData);
        }
      } catch (err) {
        if (isNextRedirectError(err)) throw err;
        setError(err instanceof Error ? err.message : "No se pudo guardar.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Identificación</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="nombreActivo">Nombre</Label>
            <Input
              id="nombreActivo"
              name="nombreActivo"
              defaultValue={initial?.nombreActivo}
              placeholder="Ej. Laptop Lenovo ThinkPad"
              required
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="subcategoriaId">Subcategoría</Label>
            <Select name="subcategoriaId" value={subcategoriaId} onValueChange={(v) => setSubcategoriaId(v ?? "")}>
              <SelectTrigger id="subcategoriaId" className="w-full">
                <SelectValue placeholder="Selecciona una subcategoría" />
              </SelectTrigger>
              <SelectContent>
                {tiposActivo.map((tipo) => (
                  <SelectGroup key={tipo.id}>
                    <SelectLabel>{tipo.name}</SelectLabel>
                    {tipo.categorias.flatMap((categoria) =>
                      categoria.subcategorias.map((subcategoria) => (
                        <SelectItem key={subcategoria.id} value={subcategoria.id}>
                          {categoria.nombre} › {subcategoria.nombre}
                        </SelectItem>
                      ))
                    )}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Código patrimonial</Label>
            {activoId ? (
              <p className="flex h-8 items-center rounded-lg border border-input bg-muted/40 px-2.5 text-sm font-medium tabular-nums">
                {initial?.codigoPatrimonial || "—"}
              </p>
            ) : (
              <p className="flex h-8 items-center px-2.5 text-sm text-muted-foreground">
                Se genera automáticamente al guardar
              </p>
            )}
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="descripcion">Descripción (opcional)</Label>
            <Textarea id="descripcion" name="descripcion" rows={2} defaultValue={initial?.descripcion} />
          </div>
        </div>
      </section>

      {subcategoriaSeleccionada && subcategoriaSeleccionada.campos.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            Especificaciones de {subcategoriaSeleccionada.nombre}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {subcategoriaSeleccionada.campos.map((campo) => (
              <CampoEspecificacionInput
                key={campo.id}
                campo={campo}
                defaultValue={initial?.especificaciones[campo.id]}
              />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Ubicación</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="sedeId">Sede</Label>
            <Select
              name="sedeId"
              value={sedeId}
              onValueChange={(v) => {
                setSedeId(v ?? "");
                setUnidadOperativaId(SIN_SELECCION);
              }}
            >
              <SelectTrigger id="sedeId" className="w-full">
                <SelectValue placeholder="Selecciona una sede" />
              </SelectTrigger>
              <SelectContent>
                {sedes.map((sede) => (
                  <SelectItem key={sede.id} value={sede.id}>
                    {sede.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="unidadOperativaId">Unidad operativa (opcional)</Label>
            <Select
              name="unidadOperativaId"
              value={unidadOperativaId}
              onValueChange={(v) => setUnidadOperativaId(v ?? SIN_SELECCION)}
              disabled={!sedeId}
            >
              <SelectTrigger id="unidadOperativaId" className="w-full">
                <SelectValue placeholder="Sin unidad operativa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SIN_SELECCION}>Sin unidad operativa</SelectItem>
                {unidadesDisponibles.map((unidad) => (
                  <SelectItem key={unidad.id} value={unidad.id}>
                    {unidad.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="ambienteId">Ambiente (opcional)</Label>
            <Select name="ambienteId" defaultValue={initial?.ambienteId || SIN_SELECCION} disabled={!sedeId}>
              <SelectTrigger id="ambienteId" className="w-full">
                <SelectValue placeholder="Sin ambiente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SIN_SELECCION}>Sin ambiente</SelectItem>
                {ambientesDisponibles.map((ambiente) => (
                  <SelectItem key={ambiente.id} value={ambiente.id}>
                    {ambiente.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Adquisición</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="fechaAdquisicion">Fecha de adquisición</Label>
            <Input
              id="fechaAdquisicion"
              name="fechaAdquisicion"
              type="date"
              defaultValue={initial?.fechaAdquisicion}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="proveedorRazonSocial">Proveedor</Label>
            <Input
              id="proveedorRazonSocial"
              name="proveedorRazonSocial"
              placeholder="Razón social"
              defaultValue={initial?.proveedorRazonSocial}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="numeroFactura">N° de factura</Label>
            <Input id="numeroFactura" name="numeroFactura" defaultValue={initial?.numeroFactura} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="codigoProyecto">Código de proyecto</Label>
            <Input id="codigoProyecto" name="codigoProyecto" defaultValue={initial?.codigoProyecto} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="costoAdquisicion">Costo de adquisición</Label>
            <Input
              id="costoAdquisicion"
              name="costoAdquisicion"
              type="number"
              step="0.01"
              min="0"
              defaultValue={initial?.costoAdquisicion}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="valorContable">Valor contable</Label>
            <Input
              id="valorContable"
              name="valorContable"
              type="number"
              step="0.01"
              min="0"
              defaultValue={initial?.valorContable}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="valorActual">Valor actual</Label>
            <Input
              id="valorActual"
              name="valorActual"
              type="number"
              step="0.01"
              min="0"
              defaultValue={initial?.valorActual}
            />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Estado</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="estadoPatrimonial">Estado patrimonial</Label>
            <Select name="estadoPatrimonial" defaultValue={initial?.estadoPatrimonial ?? "DISPONIBLE"}>
              <SelectTrigger id="estadoPatrimonial" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ESTADO_PATRIMONIAL_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="condicionFisica">Condición física (opcional)</Label>
            <Select name="condicionFisica" defaultValue={initial?.condicionFisica || SIN_SELECCION}>
              <SelectTrigger id="condicionFisica" className="w-full">
                <SelectValue placeholder="Sin definir" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SIN_SELECCION}>Sin definir</SelectItem>
                {CONDICION_FISICA_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <section className="space-y-1">
        <Label htmlFor="observaciones">Observaciones (opcional)</Label>
        <Textarea id="observaciones" name="observaciones" rows={3} defaultValue={initial?.observaciones} />
      </section>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={isPending}>
        {activoId ? "Guardar" : "Crear activo"}
      </Button>
    </form>
  );
}
