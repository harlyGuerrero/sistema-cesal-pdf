"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { toast } from "sonner";
import {
  ArrowRightIcon,
  BadgeCheckIcon,
  GlobeIcon,
  LandmarkIcon,
  LockIcon,
  MailIcon,
  ShieldCheckIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { loginAction } from "./actions";

// Diseño acordado con el usuario (referencia visual entregada en el chat):
// tarjeta partida en dos, panel izquierdo institucional + panel derecho con
// el formulario. Sin login social ni "crear cuenta" (no hay OAuth ni alta
// propia — las cuentas las crea un Super Administrador desde /usuarios).
export function LoginForm({ from }: { from?: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <Card className="overflow-hidden rounded-3xl p-0 shadow-xl">
      <CardContent className="grid p-0 md:grid-cols-2">
        <div className="relative hidden flex-col justify-between overflow-hidden p-8 text-white md:flex">
          <Image
            src="/bg-login.jpg"
            alt=""
            fill
            priority
            sizes="(min-width: 768px) 50vw, 0px"
            className="object-cover object-[center_25%]"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[color-mix(in_oklch,var(--color-primary)_88%,black)]/95 to-[var(--color-primary)]/80" />

          <div className="relative space-y-3">
            <div className="flex items-center gap-3">
              <LandmarkIcon className="size-8" />
              <span className="text-xl leading-tight font-bold">
                Sistema
                <br />
                Patrimonial
              </span>
            </div>
            <div className="h-1 w-10 rounded-full bg-[var(--color-warning)]" />
          </div>
          <p className="relative max-w-64 text-sm text-white/85">
            Control integral de activos fijos e infraestructura institucional
            con los más altos estándares de seguridad y eficiencia.
          </p>
          <div className="relative flex gap-2">
            <div className="flex size-11 items-center justify-center rounded-lg bg-white/10">
              <ShieldCheckIcon className="size-5" />
            </div>
            <div className="flex size-11 items-center justify-center rounded-lg bg-white/10">
              <BadgeCheckIcon className="size-5" />
            </div>
          </div>
        </div>

        <form
          className="flex flex-col justify-center gap-6 p-8 md:p-10"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            const formData = new FormData(event.currentTarget);
            startTransition(async () => {
              try {
                await loginAction(formData);
              } catch (err) {
                if (
                  err &&
                  typeof err === "object" &&
                  "digest" in err &&
                  typeof err.digest === "string" &&
                  err.digest.startsWith("NEXT_REDIRECT")
                ) {
                  throw err;
                }
                setError(err instanceof Error ? err.message : "No se pudo iniciar sesión.");
              }
            });
          }}
        >
          <input type="hidden" name="from" value={from ?? ""} />

          <Image src="/logo-mobile.svg" alt="CESAL" width={56} height={56} className="size-14 rounded-full" />

          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-primary">Iniciar sesión</h1>
            <p className="text-sm text-muted-foreground">Accede al sistema de gestión de activos.</p>
          </div>

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="email">Correo electrónico</FieldLabel>
              <div className="relative">
                <MailIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  placeholder="nombre@cesal.org"
                  required
                  autoFocus
                  className="h-11 rounded-xl pl-9"
                />
              </div>
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Contraseña</FieldLabel>
              <div className="relative">
                <LockIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="h-11 rounded-xl pl-9"
                />
              </div>
            </Field>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-muted-foreground">
                <input type="checkbox" name="recordar" value="true" className="size-4 rounded accent-primary" />
                Recordar sesión
              </label>
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() =>
                  toast("Pide a un Super Administrador que restablezca tu contraseña desde Usuarios.")
                }
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            {error && <FieldError>{error}</FieldError>}

            <Field>
              <Button type="submit" disabled={isPending} className="h-11 rounded-xl text-base">
                {isPending ? "Ingresando..." : "Ingresar"}
                <ArrowRightIcon />
              </Button>
            </Field>
          </FieldGroup>

          <div className="space-y-2 border-t pt-4 text-center">
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              Soporte técnico especializado
            </p>
            <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <GlobeIcon className="size-3.5" />
              Español (PE)
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
