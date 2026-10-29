// Fase 67: registro de lo escaneado en este equipo, para seguir el avance de
// un inventario. Vive en localStorage (por navegador, no compartido entre
// usuarios): es una ayuda de trabajo, no un registro oficial — el inventario
// oficial sigue siendo el de la base de datos. Se comparte entre pestañas,
// así la página Escanear se actualiza aunque el escaneo ocurra en la pestaña
// de la ficha. Todo acceso va en try/catch: el navegador puede bloquearlo.

const CLAVE = "cesal:escaneos";
const MAX_ESCANEOS = 500;
export const EVENTO_ESCANEOS = "cesal:escaneos-cambio";

export interface Escaneo {
  codigo: string;
  hora: number;
}

function esEscaneo(valor: unknown): valor is Escaneo {
  return (
    typeof valor === "object" &&
    valor !== null &&
    typeof (valor as Escaneo).codigo === "string" &&
    typeof (valor as Escaneo).hora === "number"
  );
}

export function leerEscaneosCrudo(): string {
  try {
    return localStorage.getItem(CLAVE) ?? "";
  } catch {
    return "";
  }
}

export function parsearEscaneos(crudo: string): Escaneo[] {
  if (!crudo) return [];
  try {
    const datos: unknown = JSON.parse(crudo);
    return Array.isArray(datos) ? datos.filter(esEscaneo) : [];
  } catch {
    return [];
  }
}

function guardar(escaneos: Escaneo[]) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(escaneos));
  } catch {
    // sin almacenamiento: el escaneo igual abre la ficha, solo no queda en la lista
  }
  window.dispatchEvent(new Event(EVENTO_ESCANEOS));
}

export function registrarEscaneo(codigo: string) {
  guardar([{ codigo, hora: Date.now() }, ...parsearEscaneos(leerEscaneosCrudo())].slice(0, MAX_ESCANEOS));
}

export function limpiarEscaneos() {
  guardar([]);
}

// Para useSyncExternalStore: avisa tanto de cambios en esta pestaña (evento
// propio) como en otras (evento storage).
export function suscribirEscaneos(onCambio: () => void): () => void {
  window.addEventListener(EVENTO_ESCANEOS, onCambio);
  window.addEventListener("storage", onCambio);
  return () => {
    window.removeEventListener(EVENTO_ESCANEOS, onCambio);
    window.removeEventListener("storage", onCambio);
  };
}
