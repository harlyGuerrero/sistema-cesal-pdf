"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { loginAction } from "./actions";

// Basado en el bloque login-04 de shadcn/ui (npx shadcn add login-04), sin
// login social ni "olvidé mi contraseña" (no hay proveedores OAuth ni envío
// de email en este proyecto — ver CLAUDE.md) ni "crear cuenta" (las cuentas
// las crea un Super Administrador desde /usuarios, no hay alta propia).
export function LoginForm({ from }: { from?: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <Card className="overflow-hidden p-0">
      <CardContent className="grid p-0 md:grid-cols-2">
        <form
          className="p-6 md:p-8"
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
          <FieldGroup>
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="flex size-10 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
                C
              </div>
              <h1 className="text-2xl font-bold">Sistema patrimonial CESAL</h1>
              <p className="text-balance text-muted-foreground">Inicia sesión para continuar.</p>
            </div>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input id="email" name="email" type="email" autoComplete="username" required autoFocus />
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Contraseña</FieldLabel>
              <Input id="password" name="password" type="password" autoComplete="current-password" required />
            </Field>
            {error && <FieldError>{error}</FieldError>}
            <Field>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Ingresando..." : "Ingresar"}
              </Button>
            </Field>
            <FieldDescription className="text-center">
              ¿Olvidaste tu contraseña? Pide a un Super Administrador que la restablezca.
            </FieldDescription>
          </FieldGroup>
        </form>
        <div className="relative hidden flex-col items-center justify-center gap-3 bg-primary p-8 text-primary-foreground md:flex">
          <div className="flex aspect-square size-14 items-center justify-center rounded-md bg-primary-foreground/10 text-2xl font-bold">
            C
          </div>
          <span className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold">cesal</span>
            <span className="rounded-sm bg-good px-1.5 py-0.5 text-xs font-bold text-white">ONG</span>
          </span>
          <p className="max-w-56 text-center text-sm text-primary-foreground/80">
            Sistema de gestión patrimonial e importación de activos.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
