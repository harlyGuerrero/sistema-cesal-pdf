"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROL_USUARIO_LABELS, ROL_USUARIO_OPTIONS } from "@/lib/usuarios/labels";
import { updateUsuarioAction } from "../actions";

export function UsuarioEditForm({
  usuarioId,
  nombres,
  apellidos,
  email,
  rol,
  estado,
  esUsuarioActual,
}: {
  usuarioId: string;
  nombres: string;
  apellidos: string;
  email: string;
  rol: string;
  estado: boolean;
  esUsuarioActual: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  // Fase 13: si estás editando tu propia cuenta, rol y estado ni siquiera se
  // renderizan como campos de formulario (ver más abajo) — así el server
  // action (updateUsuarioAction) puede distinguir "no vino en el FormData
  // porque es tu propia cuenta" de "vino un valor nuevo real".
  const [estadoActivo, setEstadoActivo] = useState(estado);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        if (!esUsuarioActual) {
          formData.set("estado", estadoActivo ? "true" : "");
        }
        startTransition(async () => {
          try {
            await updateUsuarioAction(usuarioId, formData);
            toast.success("Usuario actualizado.");
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "No se pudo guardar.");
          }
        });
      }}
      className="flex flex-wrap items-end gap-3"
    >
      <div className="space-y-1">
        <Label htmlFor="nombres">Nombres</Label>
        <Input id="nombres" name="nombres" defaultValue={nombres} required className="w-44" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="apellidos">Apellidos</Label>
        <Input id="apellidos" name="apellidos" defaultValue={apellidos} required className="w-44" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" defaultValue={email} required className="w-56" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="password">Nueva contraseña</Label>
        <PasswordInput id="password" name="password" minLength={8} placeholder="Sin cambios" className="w-56" />
      </div>

      {esUsuarioActual ? (
        <div className="space-y-1">
          <Label>Rol y estado</Label>
          <div className="flex h-9 items-center gap-2">
            <Badge variant={rol === "SUPER_ADMIN" ? "default" : "outline"}>{ROL_USUARIO_LABELS[rol]}</Badge>
            <span className="text-xs text-muted-foreground">no puedes cambiar tu propio rol o estado</span>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-1">
            <Label htmlFor="rol">Rol</Label>
            <Select name="rol" defaultValue={rol} required>
              <SelectTrigger id="rol" className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROL_USUARIO_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 pb-2 text-sm">
            <Switch checked={estadoActivo} onCheckedChange={setEstadoActivo} />
            Usuario activo
          </label>
        </>
      )}

      <Button type="submit" disabled={isPending}>
        Guardar
      </Button>
    </form>
  );
}
