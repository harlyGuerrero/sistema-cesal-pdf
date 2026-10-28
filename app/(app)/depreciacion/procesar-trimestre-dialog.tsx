"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangleIcon, CalculatorIcon, CheckCircle2Icon, EyeIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatSoles } from "@/lib/depreciacion/calculo";
import { TRIMESTRE_OPTIONS } from "@/lib/depreciacion/labels";
import {
  previsualizarDepreciacionAction,
  procesarDepreciacionAction,
  type ResumenProcesamiento,
  type VistaPrevia,
  type VistaPreviaFila,
} from "./actions";

// Fase 58: flujo controlado de "Procesar trimestre" — elegir periodo, ver
// la vista previa calculada en el servidor, confirmar. Nunca se procesa al
// abrir la página ni al abrir el diálogo. La confirmación no reenvía los
// importes de la vista previa: el servidor los vuelve a calcular.
export function ProcesarTrimestreDialog({
  anios,
  periodoActual,
}: {
  anios: number[];
  periodoActual: { anio: number; trimestre: number };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [anio, setAnio] = useState(String(periodoActual.anio));
  const [trimestre, setTrimestre] = useState(String(periodoActual.trimestre));
  const [vistaPrevia, setVistaPrevia] = useState<VistaPrevia | null>(null);
  const [resultado, setResultado] = useState<ResumenProcesamiento | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargandoVista, startVista] = useTransition();
  const [procesando, startProceso] = useTransition();

  const esFuturo =
    Number(anio) > periodoActual.anio || (Number(anio) === periodoActual.anio && Number(trimestre) > periodoActual.trimestre);

  function reiniciar() {
    setVistaPrevia(null);
    setResultado(null);
    setError(null);
  }

  function cambiarPeriodo(nuevoAnio: string, nuevoTrimestre: string) {
    setAnio(nuevoAnio);
    setTrimestre(nuevoTrimestre);
    reiniciar();
  }

  function generarVistaPrevia() {
    setError(null);
    startVista(async () => {
      const respuesta = await previsualizarDepreciacionAction({ anio: Number(anio), trimestre: Number(trimestre) });
      if (respuesta.ok) setVistaPrevia(respuesta.data);
      else setError(respuesta.error);
    });
  }

  function confirmar() {
    setError(null);
    startProceso(async () => {
      const respuesta = await procesarDepreciacionAction({ anio: Number(anio), trimestre: Number(trimestre) });
      if (!respuesta.ok) {
        setError(respuesta.error);
        return;
      }
      setResultado(respuesta.data);
      setVistaPrevia(null);
      toast.success(`Depreciación procesada hasta el ${respuesta.data.periodo}`, {
        description: `${respuesta.data.periodosRegistrados} periodo(s) registrados por ${formatSoles(respuesta.data.importeTotalCentavos)}.`,
      });
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reiniciar();
      }}
    >
      <DialogTrigger render={<Button />}>
        <CalculatorIcon />
        Procesar trimestre
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Procesar depreciación trimestral</DialogTitle>
          <DialogDescription>
            Registra la depreciación de todos los activos hasta el trimestre elegido, incluidos los trimestres anteriores
            que les falten. Un trimestre ya registrado nunca se vuelve a registrar.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Año</label>
            <Select value={anio} onValueChange={(value) => cambiarPeriodo(value as string, trimestre)} disabled={procesando}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {anios.map((opcion) => (
                  <SelectItem key={opcion} value={String(opcion)}>
                    {opcion}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Trimestre</label>
            <Select value={trimestre} onValueChange={(value) => cambiarPeriodo(anio, value as string)} disabled={procesando}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRIMESTRE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={String(option.value)}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {esFuturo && (
          <p className="text-sm text-muted-foreground">Ese trimestre todavía no empezó: no se puede depreciar a futuro.</p>
        )}

        {error && (
          <p role="alert" className="flex items-start gap-2 text-sm text-destructive">
            <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
            {error}
          </p>
        )}

        {vistaPrevia && <VistaPreviaDetalle vistaPrevia={vistaPrevia} />}
        {resultado && <ResultadoDetalle resultado={resultado} />}

        <DialogFooter>
          {resultado ? (
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cerrar
            </Button>
          ) : vistaPrevia ? (
            <>
              <Button variant="outline" onClick={reiniciar} disabled={procesando}>
                Cambiar periodo
              </Button>
              <Button onClick={confirmar} disabled={procesando || vistaPrevia.periodosARegistrar === 0}>
                {procesando ? <Loader2Icon className="animate-spin" /> : <CheckCircle2Icon />}
                {vistaPrevia.periodosARegistrar === 0 ? "Nada que registrar" : "Confirmar procesamiento"}
              </Button>
            </>
          ) : (
            <Button onClick={generarVistaPrevia} disabled={cargandoVista || esFuturo}>
              {cargandoVista ? <Loader2Icon className="animate-spin" /> : <EyeIcon />}
              Ver vista previa
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Cifra({ label, value, tone }: { label: string; value: string | number; tone?: "warning" | "good" }) {
  const color = tone === "warning" ? "var(--color-warning)" : tone === "good" ? "var(--color-good)" : undefined;
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums" style={color ? { color } : undefined}>
        {value}
      </p>
    </div>
  );
}

function VistaPreviaDetalle({ vistaPrevia }: { vistaPrevia: VistaPrevia }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Cifra label="Activos a procesar" value={vistaPrevia.pendientes.length} />
        <Cifra label="Periodos a registrar" value={vistaPrevia.periodosARegistrar} />
        <Cifra label="Ya al día" value={vistaPrevia.yaProcesados} />
        <Cifra label="Con errores" value={vistaPrevia.conErrores.length} tone={vistaPrevia.conErrores.length > 0 ? "warning" : undefined} />
      </div>
      <p className="text-sm">
        Importe total a depreciar hasta el {vistaPrevia.periodo}:{" "}
        <span className="font-semibold tabular-nums">{formatSoles(vistaPrevia.importeTotalCentavos)}</span>
      </p>

      <ListaPlan
        titulo="Se registrarán"
        filas={vistaPrevia.pendientes}
        vacio="Ningún activo tiene periodos pendientes hasta este trimestre."
        render={(fila) => (
          <>
            <span className="text-muted-foreground">
              {fila.periodos === 1 ? fila.desde : `${fila.desde} → ${fila.hasta} (${fila.periodos} periodos)`}
            </span>
            <span className="tabular-nums">
              {formatSoles(fila.importeCentavos ?? 0)} · VNC {formatSoles(fila.valorNetoFinalCentavos ?? 0)}
            </span>
          </>
        )}
      />
      {vistaPrevia.conErrores.length > 0 && (
        <ListaPlan
          titulo="No se procesarán por errores o configuración"
          filas={vistaPrevia.conErrores}
          tono="warning"
          render={(fila) => <span className="text-muted-foreground">{fila.detalle}</span>}
        />
      )}
      {vistaPrevia.omitidos.length > 0 && (
        <ListaPlan
          titulo="Omitidos"
          filas={vistaPrevia.omitidos}
          render={(fila) => <span className="text-muted-foreground">{fila.detalle}</span>}
        />
      )}
    </div>
  );
}

function ListaPlan({
  titulo,
  filas,
  vacio,
  tono,
  render,
}: {
  titulo: string;
  filas: VistaPreviaFila[];
  vacio?: string;
  tono?: "warning";
  render: (fila: VistaPreviaFila) => React.ReactNode;
}) {
  return (
    <section className="space-y-1.5">
      <h3
        className="text-xs font-semibold tracking-wide uppercase"
        style={{ color: tono === "warning" ? "var(--color-warning)" : "var(--muted-foreground)" }}
      >
        {titulo} ({filas.length})
      </h3>
      {filas.length === 0 ? (
        <p className="text-sm text-muted-foreground">{vacio}</p>
      ) : (
        <ul className="max-h-48 divide-y overflow-y-auto rounded-lg border text-sm">
          {filas.map((fila) => (
            <li key={fila.activoId} className="flex flex-col gap-0.5 px-3 py-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
              <span className="min-w-0 truncate">
                <span className="font-mono text-xs text-muted-foreground">{fila.codigoPatrimonial}</span> {fila.nombreActivo}
              </span>
              <span className="flex flex-col text-xs sm:items-end">{render(fila)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ResultadoDetalle({ resultado }: { resultado: ResumenProcesamiento }) {
  return (
    <div className="space-y-3">
      <p className="flex items-center gap-2 text-sm font-medium" style={{ color: "var(--color-good)" }}>
        <CheckCircle2Icon className="size-4" />
        Procesamiento hasta el {resultado.periodo} registrado.
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Cifra label="Activos procesados" value={resultado.activosProcesados} tone="good" />
        <Cifra label="Periodos registrados" value={resultado.periodosRegistrados} />
        <Cifra label="Importe depreciado" value={formatSoles(resultado.importeTotalCentavos)} />
        <Cifra label="Ya procesados" value={resultado.yaProcesados} />
        <Cifra label="Omitidos" value={resultado.omitidos} />
        <Cifra label="Con errores" value={resultado.conErrores} tone={resultado.conErrores > 0 ? "warning" : undefined} />
      </div>
    </div>
  );
}
