"use client";

import { useState } from "react";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

// Input de contraseña con botón de mostrar/ocultar (ícono de ojo) — reusado
// en /login y en alta/edición de Usuario, los 3 únicos campos de contraseña
// del sistema.
export function PasswordInput({ className, ...props }: React.ComponentProps<typeof Input>) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input {...props} type={visible ? "text" : "password"} className={cn("pr-9", className)} />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        // inset-y-0 + flex: el área tocable ocupa todo el alto del input, no
        // solo el ícono de 16px — en móvil un botón tan chico es casi
        // imposible de acertar con el dedo.
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
      >
        {visible ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
      </button>
    </div>
  );
}
