"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArchiveXIcon, CircleAlertIcon, RotateCcwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MOTIVO_BAJA_OPTIONS } from "@/lib/activos/labels";
import { darDeBajaActivoAction, reactivarActivoAction } from "./actions";

// Fase 66: diálogos de baja y reactivación. La baja nunca borra el activo:
// lo deja en BAJA con motivo y fecha (ver darDeBajaActivoAction). Los usan la
// cabecera de la página de edición y el menú de cada fila de /activos.

// Hoy en Lima (UTC-5) como "AAAA-MM-DD" — mismo criterio que el servidor.
function hoyEnLima(): string {
  return new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function DarDeBajaDialog({
  activoId,
  nombreActivo,
  open,
  onOpenChange,
}: {
  activoId: string;
  nombreActivo: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [motivo, setMotivo] = useState("");
  const [fecha, setFecha] = useState(hoyEnLima);
  const [observaciones, setObservaciones] = useState("");
  const [error, setError] = useState<string | null>(null);

  const observacionObligatoria = motivo === "OTRO";
  const listo = motivo !== "" && fecha !== "" && (!observacionObligatoria || observaciones.trim() !== "");

  function cerrar(nextOpen: boolean) {
    if (isPending) return;
    onOpenChange(nextOpen);
    if (!nextOpen) {
      setMotivo("");
      setFecha(hoyEnLima());
      setObservaciones("");
      setError(null);
    }
  }

  function confirmar() {
    setError(null);
    startTransition(async () => {
      try {
        await darDeBajaActivoAction(activoId, { motivo, fecha, observaciones });
        toast.success("Activo dado de baja.");
        onOpenChange(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo dar de baja.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={cerrar}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Dar de baja «{nombreActivo}»</DialogTitle>
          <DialogDescription>
            El activo deja de estar en uso pero no se borra: conserva su historial, documentos y depreciación.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="motivoBaja">Motivo</Label>
              <Select value={motivo} onValueChange={(value) => setMotivo((value as string) ?? "")}>
                <SelectTrigger id="motivoBaja" className="w-full">
                  <SelectValue placeholder="Elige un motivo" />
                </SelectTrigger>
                <SelectContent>
                  {MOTIVO_BAJA_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="fechaBaja">Fecha de baja</Label>
              <Input
                id="fechaBaja"
                type="date"
                value={fecha}
                max={hoyEnLima()}
                onChange={(event) => setFecha(event.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="observacionesBaja">
              Observaciones {observacionObligatoria ? "" : "(opcional)"}
            </Label>
            <Textarea
              id="observacionesBaja"
              rows={3}
              maxLength={500}
              value={observaciones}
              onChange={(event) => setObservaciones(event.target.value)}
              placeholder={
                observacionObligatoria
                  ? "Describe el motivo de la baja"
                  : "Ej. N° de acta o resolución, estado en que se encontró…"
              }
            />
          </div>

          <ul className="list-disc space-y-0.5 rounded-md bg-muted/60 py-2.5 pr-3 pl-7 text-xs text-muted-foreground">
            <li>Se le quita el responsable actual.</li>
            <li>La depreciación se registra hasta el trimestre de la baja y luego se detiene.</li>
            <li>No se podrá editar ni asignar hasta reactivarlo.</li>
          </ul>

          {error && (
            <p className="flex items-start gap-1.5 text-sm text-destructive">
              <CircleAlertIcon className="mt-0.5 size-4 shrink-0" />
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" disabled={isPending} onClick={() => cerrar(false)}>
            Cancelar
          </Button>
          <Button type="button" variant="destructive" disabled={!listo || isPending} onClick={confirmar}>
            <ArchiveXIcon />
            {isPending ? "Dando de baja..." : "Dar de baja"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DarDeBajaButton({ activoId, nombreActivo }: { activoId: string; nombreActivo: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <ArchiveXIcon />
        Dar de baja
      </Button>
      <DarDeBajaDialog activoId={activoId} nombreActivo={nombreActivo} open={open} onOpenChange={setOpen} />
    </>
  );
}

export function ReactivarActivoButton({ activoId, nombreActivo }: { activoId: string; nombreActivo: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);

  function cerrar(nextOpen: boolean) {
    if (isPending) return;
    setOpen(nextOpen);
    if (!nextOpen) {
      setMotivo("");
      setError(null);
    }
  }

  function confirmar() {
    setError(null);
    startTransition(async () => {
      try {
        await reactivarActivoAction(activoId, motivo);
        toast.success("Activo reactivado: quedó como Disponible.");
        setOpen(false);
        setMotivo("");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo reactivar.");
      }
    });
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <RotateCcwIcon />
        Reactivar
      </Button>
      <Dialog open={open} onOpenChange={cerrar}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reactivar «{nombreActivo}»</DialogTitle>
            <DialogDescription>
              Vuelve a quedar Disponible, sin responsable. La baja anterior sigue visible en el historial de
              movimientos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1">
            <Label htmlFor="motivoReactivacion">Motivo de la reactivación</Label>
            <Textarea
              id="motivoReactivacion"
              rows={3}
              maxLength={500}
              value={motivo}
              onChange={(event) => setMotivo(event.target.value)}
              placeholder="Ej. la baja se registró por error, el bien fue recuperado…"
            />
          </div>
          {error && (
            <p className="flex items-start gap-1.5 text-sm text-destructive">
              <CircleAlertIcon className="mt-0.5 size-4 shrink-0" />
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={isPending} onClick={() => cerrar(false)}>
              Cancelar
            </Button>
            <Button type="button" disabled={!motivo.trim() || isPending} onClick={confirmar}>
              <RotateCcwIcon />
              {isPending ? "Reactivando..." : "Reactivar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
