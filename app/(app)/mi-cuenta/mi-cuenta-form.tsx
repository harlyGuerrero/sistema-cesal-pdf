"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SaveIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Badge } from "@/components/ui/badge";
import { ROL_USUARIO_LABELS } from "@/lib/usuarios/labels";
import { updateUsuarioAction } from "../usuarios/actions";

// updateUsuarioAction ya distingue "esUsuarioActual" (ver usuario-edit-form.tsx
// en /usuarios/[id]) e ignora rol/estado en ese caso — acá reusamos esa misma
// acción, solo con un layout en grid en vez del flex-wrap compacto que usa la
// pantalla de gestión de Usuario. router.refresh() al guardar porque esta
// página no vive bajo /usuarios: la revalidatePath del server action no la
// cubre, y el nombre/email también se ven en el sidebar (mismo layout).
export function MiCuentaForm({
  usuarioId,
  nombres,
  apellidos,
  email,
  rol,
}: {
  usuarioId: string;
  nombres: string;
  apellidos: string;
  email: string;
  rol: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(async () => {
          try {
            await updateUsuarioAction(usuarioId, formData);
            toast.success("Tus datos se actualizaron correctamente.");
            router.refresh();
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "No se pudo guardar.");
          }
        });
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="nombres">Nombres</Label>
          <Input id="nombres" name="nombres" defaultValue={nombres} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="apellidos">Apellidos</Label>
          <Input id="apellidos" name="apellidos" defaultValue={apellidos} required />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" defaultValue={email} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Nueva contraseña</Label>
          <PasswordInput id="password" name="password" minLength={8} placeholder="Sin cambios" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Rol y estado</Label>
        <div className="flex h-9 items-center gap-2">
          <Badge variant={rol === "SUPER_ADMIN" ? "default" : "outline"}>{ROL_USUARIO_LABELS[rol]}</Badge>
          <span className="text-xs text-muted-foreground">no puedes cambiar tu propio rol o estado</span>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          <SaveIcon />
          Guardar cambios
        </Button>
      </div>
    </form>
  );
}
