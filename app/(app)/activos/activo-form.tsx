"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  IdCardIcon,
  MapPinIcon,
  NotebookPenIcon,
  SaveIcon,
  ShieldIcon,
  ShoppingCartIcon,
  SlidersHorizontalIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormSection } from "@/components/form-section";
import { GroupedCombobox } from "@/components/grouped-combobox";
import { subcategoriaGroups } from "@/lib/activos/subcategoria-groups";
import { CONDICION_FISICA_OPTIONS, ESTADO_PATRIMONIAL_OPTIONS } from "@/lib/activos/labels";
import { CampoEspecificacionInput, type CampoEspecificacionOption } from "./campo-especificacion-input";
import { createActivoAction, updateActivoAction } from "./actions";
import {
  HISTORIAL_VACIO,
  formatSoles,
  resumirDepreciacion,
  valorContableCalculado,
  type HistorialAgregado,
} from "@/lib/depreciacion/calculo";

export interface TipoActivoTree {
  id: string;
  name: string;
  // Fase 60: tasa anual de depreciación activa del tipo (ej. "25.0000"), o
  // null si no tiene una configurada.
  tasaAnual: string | null;
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
  tipoActivoId: string;
  subcategoriaId: string;
  codigoPatrimonial: string;
  sedeId: string;
  unidadOperativaId: string;
  ambienteId: string;
  proveedorRazonSocial: string;
  fechaAdquisicion: string;
  numeroFactura: string;
  numeroFC: string;
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
const MAX_TEXTAREA = 255;

function isNextRedirectError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof error.digest === "string" &&
    error.digest.startsWith("NEXT_REDIRECT")
  );
}

// Foto de todos los valores del formulario, para saber si hay cambios sin
// guardar. Se lee del DOM (FormData) y no del estado de React porque varios
// campos son no controlados, incluidos los inputs ocultos de los Select.
function snapshotFormulario(form: HTMLFormElement): string {
  return JSON.stringify(
    [...new FormData(form).entries()].map(([key, value]) => [key, typeof value === "string" ? value : value.name])
  );
}

function flattenSubcategorias(tiposActivo: TipoActivoTree[]) {
  return tiposActivo.flatMap((tipo) =>
    tipo.categorias.flatMap((categoria) =>
      categoria.subcategorias.map((subcategoria) => ({
        ...subcategoria,
        tipoActivoId: tipo.id,
        tipoTasaAnual: tipo.tasaAnual,
        tipoActivoNombre: tipo.name,
        categoriaNombre: categoria.nombre,
      }))
    )
  );
}

// Textarea con contador de caracteres (Descripción/Observaciones) — dirección
// visual de Fase 18, ver components/form-section.tsx.
function TextareaConContador({
  id,
  name,
  defaultValue,
  rows,
  placeholder,
}: {
  id: string;
  name: string;
  defaultValue?: string;
  rows: number;
  placeholder?: string;
}) {
  const [length, setLength] = useState(defaultValue?.length ?? 0);
  return (
    <div className="relative">
      <Textarea
        id={id}
        name={name}
        rows={rows}
        maxLength={MAX_TEXTAREA}
        defaultValue={defaultValue}
        placeholder={placeholder}
        onChange={(event) => setLength(event.target.value.length)}
        className="pb-6"
      />
      <span className="pointer-events-none absolute right-2.5 bottom-2 text-xs text-muted-foreground">
        {length}/{MAX_TEXTAREA}
      </span>
    </div>
  );
}

// Input de montos con prefijo "S/." — dirección visual de Fase 18.
function CurrencyInput({
  id,
  name,
  defaultValue,
  onValueChange,
}: {
  id: string;
  name: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-muted-foreground">
        S/.
      </span>
      <Input
        id={id}
        name={name}
        type="number"
        step="0.01"
        min="0"
        defaultValue={defaultValue}
        onChange={onValueChange ? (event) => onValueChange(event.target.value) : undefined}
        className="pl-8"
      />
    </div>
  );
}

// Fase 60: valor calculado por la depreciación, de solo lectura — mismo
// estilo que los campos heredados de una importación (N° de factura, N° FC).
// No lleva `name`: no viaja en el formulario, el servidor lo recalcula.
function ValorCalculado({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <p className="flex h-8 items-center rounded-lg border border-input bg-muted/40 px-2.5 text-sm font-medium tabular-nums">
        {formatSoles(valor)}
      </p>
    </div>
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
  esDeImportacion = false,
  historialDepreciacion = HISTORIAL_VACIO,
  ultimoPeriodoDepreciado = null,
}: {
  activoId?: string;
  initial?: ActivoFormInitial;
  tiposActivo: TipoActivoTree[];
  sedes: SedeOption[];
  // Fase 51: un Activo nacido de una importación de PDF ya trae numeroFactura
  // heredado del Import (ver activo-creation.ts) — el input manual se oculta
  // para no invitar a pisarlo a mano; el alta manual (sin PDF de por medio)
  // sigue mostrándolo porque ahí no hay Import del que heredarlo.
  esDeImportacion?: boolean;
  // Fase 60: depreciación ya registrada del activo (vacía en un alta), para
  // calcular en vivo el valor contable / actual con la misma función que el
  // servidor.
  historialDepreciacion?: HistorialAgregado;
  ultimoPeriodoDepreciado?: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Fase 62: al editar, "Guardar" solo se habilita si algo cambió respecto
  // de lo último guardado; tras guardar vuelve a bloquearse, y deshacer un
  // cambio también lo bloquea. Base UI no dispara eventos nativos al elegir
  // en un Select, así que se re-compara después de cada interacción con el
  // formulario (los eventos del popup llegan por el árbol de React aunque se
  // rendericen en un portal).
  const formRef = useRef<HTMLFormElement>(null);
  const baselineRef = useRef<string | null>(null);
  const [hayCambios, setHayCambios] = useState(false);
  const verificarCambios = useCallback(() => {
    setTimeout(() => {
      const form = formRef.current;
      if (!form || baselineRef.current === null) return;
      setHayCambios(snapshotFormulario(form) !== baselineRef.current);
    }, 0);
  }, []);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (formRef.current) baselineRef.current = snapshotFormulario(formRef.current);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const [tipoActivoId, setTipoActivoId] = useState(initial?.tipoActivoId ?? "");
  const [subcategoriaId, setSubcategoriaId] = useState(initial?.subcategoriaId ?? "");
  const [sedeId, setSedeId] = useState(initial?.sedeId ?? "");
  const [unidadOperativaId, setUnidadOperativaId] = useState(initial?.unidadOperativaId || SIN_SELECCION);

  const subcategorias = flattenSubcategorias(tiposActivo);
  const subcategoriaSeleccionada = subcategorias.find((s) => s.id === subcategoriaId);
  const tipoSeleccionado = tiposActivo.find((tipo) => tipo.id === tipoActivoId);
  // La subcategoría es opcional: el tipo de activo sí es obligatorio (define
  // el prefijo del código patrimonial y la tasa de depreciación). Con un tipo
  // elegido, el buscador solo ofrece sus subcategorías.
  const tiposParaSubcategoria = tipoSeleccionado ? [tipoSeleccionado] : tiposActivo;

  function handleTipoActivoChange(value: string) {
    setTipoActivoId(value);
    if (subcategoriaSeleccionada && subcategoriaSeleccionada.tipoActivoId !== value) {
      setSubcategoriaId("");
    }
  }

  function handleSubcategoriaChange(value: string) {
    setSubcategoriaId(value);
    const subcategoria = subcategorias.find((s) => s.id === value);
    if (subcategoria) setTipoActivoId(subcategoria.tipoActivoId);
  }

  // Fase 60: valor contable y valor actual. Con costo, fecha y una tasa
  // válidos (depreciación definida), los dos son el valor neto y se muestran
  // calculados y bloqueados; si no, siguen siendo campos manuales.
  const [costo, setCosto] = useState(initial?.costoAdquisicion ?? "");
  const [fecha, setFecha] = useState(initial?.fechaAdquisicion ?? "");
  const valorCalculado = valorContableCalculado(
    resumirDepreciacion(
      {
        costoAdquisicion: costo.trim() || null,
        fechaAdquisicion: fecha ? new Date(fecha) : null,
        estadoPatrimonial: "DISPONIBLE",
        tasaAnual: tipoSeleccionado?.tasaAnual ?? null,
      },
      historialDepreciacion
    )
  );

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
    const snapshotEnviado = snapshotFormulario(event.currentTarget);
    for (const key of ["unidadOperativaId", "ambienteId", "condicionFisica"]) {
      if (formData.get(key) === SIN_SELECCION) formData.set(key, "");
    }

    startTransition(async () => {
      try {
        if (activoId) {
          await updateActivoAction(activoId, formData);
          baselineRef.current = snapshotEnviado;
          setHayCambios(false);
          verificarCambios();
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
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      onInput={verificarCambios}
      onChange={verificarCambios}
      onClick={verificarCambios}
      onKeyUp={verificarCambios}
      className="space-y-5 p-4 sm:p-6"
    >
      <FormSection icon={IdCardIcon} title="Identificación" color="var(--primary)">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="nombreActivo">Nombre</Label>
            <Input
              id="nombreActivo"
              name="nombreActivo"
              defaultValue={initial?.nombreActivo}
              placeholder="Ej. Laptop Lenovo ThinkPad"
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="tipoActivoId">Tipo de activo</Label>
            <Select name="tipoActivoId" value={tipoActivoId} onValueChange={(v) => handleTipoActivoChange(v ?? "")}>
              <SelectTrigger id="tipoActivoId" className="w-full">
                <SelectValue placeholder="Selecciona un tipo de activo" />
              </SelectTrigger>
              <SelectContent>
                {tiposActivo.map((tipo) => (
                  <SelectItem key={tipo.id} value={tipo.id}>
                    {tipo.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="subcategoriaId">Subcategoría (opcional)</Label>
            <GroupedCombobox
              id="subcategoriaId"
              name="subcategoriaId"
              groups={subcategoriaGroups(tiposParaSubcategoria)}
              value={subcategoriaId}
              onValueChange={handleSubcategoriaChange}
              placeholder="Busca una subcategoría"
              emptyMessage="Ninguna subcategoría coincide."
              clearable
              className="w-full"
            />
          </div>
          <div className="space-y-1">
            <Label>Código patrimonial</Label>
            {activoId ? (
              <p className="flex h-8 items-center rounded-lg border border-input bg-muted/40 px-2.5 text-sm font-medium tabular-nums">
                {initial?.codigoPatrimonial || "—"}
              </p>
            ) : (
              <p className="flex h-8 items-center rounded-lg border border-dashed border-input px-2.5 text-sm text-muted-foreground">
                Se genera automáticamente al guardar
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="descripcion">Descripción (opcional)</Label>
            <TextareaConContador
              id="descripcion"
              name="descripcion"
              rows={2}
              defaultValue={initial?.descripcion}
              placeholder="Agrega una descripción del activo..."
            />
          </div>
        </div>
      </FormSection>

      {subcategoriaSeleccionada && subcategoriaSeleccionada.campos.length > 0 && (
        <FormSection icon={SlidersHorizontalIcon} title={`Especificaciones de ${subcategoriaSeleccionada.nombre}`} color="var(--color-chart-2)">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {subcategoriaSeleccionada.campos.map((campo) => (
              <CampoEspecificacionInput
                key={campo.id}
                campo={campo}
                defaultValue={initial?.especificaciones[campo.id]}
              />
            ))}
          </div>
        </FormSection>
      )}

      <FormSection icon={MapPinIcon} title="Ubicación" color="var(--color-good)">
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
      </FormSection>

      <FormSection icon={ShoppingCartIcon} title="Adquisición" color="var(--color-chart-5)">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="fechaAdquisicion">Fecha de adquisición</Label>
            <Input
              id="fechaAdquisicion"
              name="fechaAdquisicion"
              type="date"
              defaultValue={initial?.fechaAdquisicion}
              onChange={(event) => setFecha(event.target.value)}
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
          {esDeImportacion ? (
            <div className="space-y-1">
              <Label>N° de factura</Label>
              <p className="flex h-8 items-center rounded-lg border border-input bg-muted/40 px-2.5 text-sm font-medium">
                {initial?.numeroFactura || "—"}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <Label htmlFor="numeroFactura">N° de factura</Label>
              <Input id="numeroFactura" name="numeroFactura" defaultValue={initial?.numeroFactura} />
            </div>
          )}
          {esDeImportacion ? (
            <div className="space-y-1">
              <Label>N° FC</Label>
              <p className="flex h-8 items-center rounded-lg border border-input bg-muted/40 px-2.5 text-sm font-medium">
                {initial?.numeroFC || "—"}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <Label htmlFor="numeroFC">N° FC</Label>
              <Input id="numeroFC" name="numeroFC" defaultValue={initial?.numeroFC} placeholder="Correlativo interno CESAL" />
            </div>
          )}
          <div className="space-y-1">
            <Label htmlFor="codigoProyecto">Código de proyecto</Label>
            <Input id="codigoProyecto" name="codigoProyecto" defaultValue={initial?.codigoProyecto} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="costoAdquisicion">Costo de adquisición</Label>
            <CurrencyInput
              id="costoAdquisicion"
              name="costoAdquisicion"
              defaultValue={initial?.costoAdquisicion}
              onValueChange={setCosto}
            />
          </div>
          {valorCalculado !== null ? (
            <>
              <ValorCalculado label="Valor contable" valor={valorCalculado} />
              <ValorCalculado label="Valor actual" valor={valorCalculado} />
            </>
          ) : (
            <>
              <div className="space-y-1">
                <Label htmlFor="valorContable">Valor contable</Label>
                <CurrencyInput id="valorContable" name="valorContable" defaultValue={initial?.valorContable} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="valorActual">Valor actual</Label>
                <CurrencyInput id="valorActual" name="valorActual" defaultValue={initial?.valorActual} />
              </div>
            </>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {valorCalculado === null
            ? "El valor contable y el valor actual se calculan solos cuando el activo tiene costo, fecha de adquisición y un tipo con tasa de depreciación."
            : historialDepreciacion.cantidad > 0
              ? `Valor contable y valor actual = costo menos la depreciación registrada hasta el ${ultimoPeriodoDepreciado ?? "último trimestre procesado"}. Se actualizan al procesar cada trimestre.`
              : "Valor contable y valor actual = costo de adquisición, porque todavía no se procesó ningún trimestre. Bajarán al procesar la depreciación."}
        </p>
      </FormSection>

      <FormSection icon={ShieldIcon} title="Estado" color="var(--color-warning)">
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
      </FormSection>

      <FormSection icon={NotebookPenIcon} title="Observaciones" color="var(--color-neutral)">
        <TextareaConContador
          id="observaciones"
          name="observaciones"
          rows={3}
          defaultValue={initial?.observaciones}
          placeholder="Ingrese observaciones adicionales sobre el activo..."
        />
      </FormSection>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-col items-center justify-center gap-1.5">
        <Button
          type="submit"
          disabled={isPending || (Boolean(activoId) && !hayCambios)}
          className="w-full sm:w-auto"
        >
          <SaveIcon />
          {activoId ? "Guardar" : "Crear activo"}
        </Button>
        {activoId && !hayCambios && !isPending && (
          <p className="text-xs text-muted-foreground">Sin cambios por guardar.</p>
        )}
      </div>
    </form>
  );
}
