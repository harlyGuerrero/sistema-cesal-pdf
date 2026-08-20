import { InfoIcon, UserIcon, CircleIcon } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireSessionUsuario } from "@/lib/auth/session";
import { PageBreadcrumb } from "@/components/page-breadcrumb";
import { FormSection } from "@/components/form-section";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { nombreCompleto, inicialesPersona } from "@/lib/nombre-completo";
import { ROL_USUARIO_LABELS, ROL_USUARIO_META } from "@/lib/usuarios/labels";
import { MiCuentaForm } from "./mi-cuenta-form";

// Fase 48: a diferencia de /usuarios/[id] (requireSuperAdmin, cualquier
// usuario), esta pantalla la puede abrir cualquier cuenta logueada — siempre
// opera sobre el propio actor.id, nunca recibe un id por la URL.
export default async function MiCuentaPage() {
  const actor = await requireSessionUsuario();
  const usuario = await prisma.usuario.findUniqueOrThrow({ where: { id: actor.id } });
  const rolMeta = ROL_USUARIO_META[usuario.rol];

  return (
    <>
      <PageBreadcrumb items={[{ label: "Mi Cuenta" }]} />
      <main className="space-y-6 p-6">
        <div>
          <h1 className="text-xl font-medium">Mi Cuenta</h1>
          <p className="text-sm text-muted-foreground">Consulta y actualiza tu información personal.</p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="flex flex-col items-center gap-3 rounded-2xl border bg-card p-6 text-center lg:col-span-1 justify-center">
            <Avatar className="size-20 shrink-0 rounded-full">
              <AvatarFallback
                className="rounded-full text-xl font-semibold uppercase"
                style={{
                  backgroundColor: `color-mix(in oklch, ${rolMeta.color} 15%, transparent)`,
                  color: rolMeta.color,
                }}
              >
                {inicialesPersona(usuario)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{nombreCompleto(usuario)}</p>
              <p className="text-sm text-muted-foreground">{usuario.email}</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
                style={{
                  backgroundColor: `color-mix(in oklch, ${rolMeta.color} 15%, transparent)`,
                  color: rolMeta.color,
                }}
              >
                <rolMeta.icon className="size-3" />
                {ROL_USUARIO_LABELS[usuario.rol]}
              </span>
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
                style={{
                  backgroundColor: usuario.estado
                    ? "color-mix(in oklch, var(--color-good) 15%, transparent)"
                    : "color-mix(in oklch, var(--color-neutral) 15%, transparent)",
                  color: usuario.estado ? "var(--color-good)" : "var(--color-neutral)",
                }}
              >
                <CircleIcon className="size-2 fill-current" />
                {usuario.estado ? "Activo" : "Inactivo"}
              </span>
            </div>
          </div>

          <FormSection icon={UserIcon} title="Datos de la cuenta" color="var(--color-chart-5)" className="lg:col-span-2">
            <MiCuentaForm
              usuarioId={usuario.id}
              nombres={usuario.nombres}
              apellidos={usuario.apellidos}
              email={usuario.email}
              rol={usuario.rol}
            />
          </FormSection>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <InfoIcon className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-semibold">Información importante</p>
            <p className="text-sm text-muted-foreground">
              Tu rol y estado son gestionados únicamente por el Super Administrador del sistema.
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
