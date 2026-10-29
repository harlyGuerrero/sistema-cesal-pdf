"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { CameraIcon, CameraOffIcon, ExternalLinkIcon, ScanBarcodeIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  abrirFichaEscaneada,
  normalizarCodigoEscaneado,
  PESTANA_FICHA,
  urlDeCodigoEscaneado,
} from "@/lib/activos/codigo-escaneado";
import {
  leerEscaneosCrudo,
  limpiarEscaneos,
  parsearEscaneos,
  suscribirEscaneos,
} from "@/lib/activos/registro-escaneos";
import { ESTADO_PATRIMONIAL_COLOR_VAR, ESTADO_PATRIMONIAL_LABELS } from "@/lib/activos/labels";
import { buscarActivosEscaneadosAction, type ActivoEscaneado } from "./actions";

// BarcodeDetector (Shape Detection API) no está en los tipos de TypeScript.
// Existe en Chrome para Android, ChromeOS y macOS; no en Windows ni Firefox.
interface BarcodeDetectorLike {
  detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]>;
}
type BarcodeDetectorCtor = new (options: { formats: string[] }) => BarcodeDetectorLike;

function obtenerBarcodeDetector(): BarcodeDetectorCtor | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector ?? null;
}

function formatHora(ms: number): string {
  return new Date(ms).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// Fase 67: modo inventario. Cada código leído (lector de mano en el campo,
// o cámara del celular) abre la ficha en la pestaña de fichas — siempre la
// misma, ver PESTANA_FICHA — y queda en la lista de abajo, que también
// recoge lo escaneado desde cualquier otra pantalla o desde esa pestaña.
export function Escaner() {
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [codigo, setCodigo] = useState("");
  const [camaraDisponible, setCamaraDisponible] = useState(false);
  const [camaraActiva, setCamaraActiva] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Leído con la cámara cuando el navegador no dejó abrir la pestaña (fuera
  // de un clic o tecla no se permite): se ofrece como enlace.
  const [pendiente, setPendiente] = useState<string | null>(null);
  const [activos, setActivos] = useState<Map<string, ActivoEscaneado>>(new Map());

  const crudo = useSyncExternalStore(suscribirEscaneos, leerEscaneosCrudo, () => "");
  const escaneos = useMemo(() => parsearEscaneos(crudo), [crudo]);
  const codigosUnicos = useMemo(() => [...new Set(escaneos.map((escaneo) => escaneo.codigo))], [escaneos]);
  const clave = codigosUnicos.join(",");

  useEffect(() => {
    // Solo se sabe en el cliente; en el servidor la cámara se asume ausente.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCamaraDisponible(obtenerBarcodeDetector() !== null && Boolean(navigator.mediaDevices?.getUserMedia));
    // Al volver de la pestaña de la ficha, el campo queda listo para el siguiente.
    const reenfocar = () => inputRef.current?.focus();
    window.addEventListener("focus", reenfocar);
    return () => {
      window.removeEventListener("focus", reenfocar);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (!clave) return;
    let vigente = true;
    buscarActivosEscaneadosAction(clave.split(","))
      .then((encontrados) => {
        if (vigente) setActivos(new Map(encontrados.map((activo) => [activo.codigoPatrimonial, activo])));
      })
      .catch(() => {
        // sin conexión: la lista sigue mostrando los códigos
      });
    return () => {
      vigente = false;
    };
  }, [clave]);

  function abrir(texto: string) {
    const normalizado = normalizarCodigoEscaneado(texto);
    if (!normalizado) return;
    setCodigo("");
    setPendiente(abrirFichaEscaneada(normalizado) ? null : normalizado);
    inputRef.current?.focus();
  }

  function detenerCamara() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCamaraActiva(false);
  }

  async function iniciarCamara() {
    const Detector = obtenerBarcodeDetector();
    if (!Detector) return;
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      setCamaraActiva(true);
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();

      const detector = new Detector({ formats: ["code_128", "qr_code"] });
      let ultimo = "";
      const buscar = async () => {
        if (!streamRef.current) return;
        try {
          const [resultado] = await detector.detect(video);
          const leido = resultado?.rawValue ? normalizarCodigoEscaneado(resultado.rawValue) : "";
          // La cámara sigue encendida para inventariar varios bienes; el
          // mismo código delante del lente no se registra dos veces seguidas.
          if (leido && leido !== ultimo) {
            ultimo = leido;
            setPendiente(abrirFichaEscaneada(leido) ? null : leido);
          }
        } catch {
          // un cuadro que no se pudo analizar: se prueba con el siguiente
        }
        setTimeout(buscar, 300);
      };
      buscar();
    } catch {
      detenerCamara();
      setError("No se pudo usar la cámara. Revisa el permiso del navegador.");
    }
  }

  const encontrados = codigosUnicos.filter((c) => activos.has(c)).length;

  return (
    <div className="space-y-6">
      <div className="space-y-5 rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            abrir(codigo);
          }}
          className="space-y-2"
        >
          <label htmlFor="codigo-escaneado" className="text-sm font-medium">
            Código patrimonial
          </label>
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              id="codigo-escaneado"
              autoFocus
              autoComplete="off"
              spellCheck={false}
              value={codigo}
              onChange={(event) => setCodigo(event.target.value)}
              placeholder="Escanea la etiqueta o escribe el código"
              className="font-mono uppercase"
            />
            <Button type="submit" disabled={!codigo.trim()}>
              <ScanBarcodeIcon />
              Ver ficha
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            La ficha se abre en una pestaña aparte, siempre la misma. Puedes seguir escaneando desde esa pestaña o
            desde cualquier pantalla del sistema.
          </p>
        </form>

        {pendiente && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-primary/5 px-3 py-2.5 text-sm">
            <span>
              Leído <span className="font-mono font-medium">{pendiente}</span>
            </span>
            <Button
              size="sm"
              render={<a href={urlDeCodigoEscaneado(pendiente)} target={PESTANA_FICHA} />}
              nativeButton={false}
              onClick={() => setPendiente(null)}
            >
              <ExternalLinkIcon />
              Abrir ficha
            </Button>
          </div>
        )}

        {camaraDisponible && (
          <div className="space-y-3 border-t pt-5">
            <div className={camaraActiva ? "overflow-hidden rounded-lg border bg-black" : "hidden"}>
              <video ref={videoRef} className="aspect-video w-full object-cover" muted playsInline />
            </div>
            {camaraActiva ? (
              <Button type="button" variant="outline" className="w-full" onClick={detenerCamara}>
                <CameraOffIcon />
                Detener cámara
              </Button>
            ) : (
              <Button type="button" variant="outline" className="w-full" onClick={iniciarCamara}>
                <CameraIcon />
                Escanear con la cámara
              </Button>
            )}
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <h2 className="text-sm font-medium">Escaneados en este equipo</h2>
            <p className="text-xs text-muted-foreground tabular-nums">
              {escaneos.length} lecturas · {codigosUnicos.length} activos distintos · {encontrados} encontrados
              {codigosUnicos.length - encontrados > 0 && ` · ${codigosUnicos.length - encontrados} sin registro`}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={escaneos.length === 0}
            onClick={() => {
              limpiarEscaneos();
              setActivos(new Map());
            }}
          >
            <Trash2Icon />
            Limpiar lista
          </Button>
        </div>

        {escaneos.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground sm:px-6">
            Todavía no escaneaste ningún activo. La lista sirve para seguir el avance de un inventario.
          </p>
        ) : (
          <ul className="max-h-[28rem] divide-y overflow-y-auto">
            {escaneos.map((escaneo, index) => {
              const activo = activos.get(escaneo.codigo);
              return (
                <li key={`${escaneo.hora}-${index}`} className="flex items-center gap-3 px-4 py-2.5 sm:px-6">
                  <span className="w-16 shrink-0 text-xs text-muted-foreground tabular-nums">
                    {formatHora(escaneo.hora)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {activo ? activo.nombreActivo : <span className="text-destructive">Sin registro en el sistema</span>}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      <span className="font-mono">{escaneo.codigo}</span>
                      {activo?.sede && ` · ${activo.sede}`}
                    </p>
                  </div>
                  {activo && (
                    <span className="hidden items-center gap-1.5 text-xs sm:inline-flex">
                      <span
                        className="size-2 rounded-full"
                        style={{ backgroundColor: ESTADO_PATRIMONIAL_COLOR_VAR[activo.estadoPatrimonial] }}
                      />
                      {ESTADO_PATRIMONIAL_LABELS[activo.estadoPatrimonial]}
                    </span>
                  )}
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    render={
                      <a
                        href={urlDeCodigoEscaneado(escaneo.codigo)}
                        target={PESTANA_FICHA}
                        aria-label={`Ver ficha de ${escaneo.codigo}`}
                      />
                    }
                    nativeButton={false}
                  >
                    <ExternalLinkIcon />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
