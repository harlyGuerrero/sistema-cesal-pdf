import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

const KEY_LENGTH = 64;

// Fase 13: hash de contraseñas con scrypt (node:crypto, sin dependencia
// nueva) — formato "saltHex:hashHex", igual criterio que el resto del stack
// de no agregar una librería para algo que la plataforma ya resuelve.
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hashHex] = stored.split(":");
  if (!salt || !hashHex) return false;

  const hash = Buffer.from(hashHex, "hex");
  const derived = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;

  // Buffer.compare primero: timingSafeEqual lanza si las longitudes
  // difieren, y una longitud distinta ya filtraría información por timing
  // si no se corta acá antes.
  if (derived.length !== hash.length) return false;
  return timingSafeEqual(derived, hash);
}
