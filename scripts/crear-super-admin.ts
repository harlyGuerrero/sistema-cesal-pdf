import "dotenv/config";
import { createInterface } from "node:readline";
import { stdin, stdout } from "node:process";
import { prisma } from "../lib/db";
import { hashPassword } from "../lib/auth/password";
import { nombreCompleto } from "../lib/nombre-completo";

// Fase 13: no hay seed con contraseña fija a propósito (ver
// prisma/schema.prisma, comentario en Usuario) — el primer SUPER_ADMIN se
// crea a mano, una sola vez, por consola. Uso: npm run crear-admin (ver
// README, sección "Primer usuario").
//
// Usa el iterador async de readline en vez de encadenar rl.question() (como
// hace readline/promises): en este entorno, la segunda llamada a
// rl.question() se queda colgada para siempre cuando stdin no es un TTY real
// (pipe/redirección) — el iterador sí procesa las tres líneas.
async function ask(it: AsyncIterator<string>, prompt: string): Promise<string> {
  stdout.write(prompt);
  const { value, done } = await it.next();
  if (done) throw new Error("Entrada terminada inesperadamente.");
  return value;
}

async function main() {
  const rl = createInterface({ input: stdin, output: stdout });
  const it = rl[Symbol.asyncIterator]();

  try {
    const nombres = (await ask(it, "Nombres: ")).trim();
    const apellidos = (await ask(it, "Apellidos: ")).trim();
    const email = (await ask(it, "Email: ")).trim().toLowerCase();
    const password = await ask(it, "Contraseña (mínimo 8 caracteres): ");

    if (!nombres || !apellidos || !email) {
      throw new Error("Nombres, apellidos y email son obligatorios.");
    }
    if (password.length < 8) {
      throw new Error("La contraseña debe tener al menos 8 caracteres.");
    }

    const existing = await prisma.usuario.findUnique({ where: { email } });
    if (existing) {
      throw new Error(`Ya existe un usuario con el email "${email}".`);
    }

    const passwordHash = await hashPassword(password);
    const usuario = await prisma.usuario.create({
      data: { nombres, apellidos, email, passwordHash, rol: "SUPER_ADMIN" },
    });

    console.log(`\nSuper Administrador creado: ${nombreCompleto(usuario)} <${usuario.email}>.`);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(`\nError: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
});
