"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export interface CampoEspecificacionOption {
  id: string;
  nombre: string;
  etiqueta: string;
  tipoDato: string;
  unidad: string | null;
  obligatorio: boolean;
  catalogo: { id: string; nombre: string; valores: { id: string; valor: string }[] } | null;
}

// Fase 6 de Activos: un input por CampoEspecificacion, eligiendo el control
// según tipoDato — el mismo componente sirve para cualquier subcategoría sin
// código nuevo (criterio de cierre de Fase 4).
export function CampoEspecificacionInput({
  campo,
  defaultValue,
}: {
  campo: CampoEspecificacionOption;
  defaultValue?: string;
}) {
  const [checked, setChecked] = useState(defaultValue === "true");

  const name = `campo_${campo.id}`;
  const id = `campo-${campo.id}`;
  const label = campo.unidad ? `${campo.etiqueta} (${campo.unidad})` : campo.etiqueta;

  if (campo.tipoDato === "BOOLEANO") {
    return (
      <div className="flex items-center justify-between rounded-md border px-3 py-2">
        <Label htmlFor={id} className="font-normal">
          {label}
          {campo.obligatorio && <span className="text-destructive"> *</span>}
        </Label>
        <input type="hidden" name={name} value={checked ? "true" : ""} />
        <Switch id={id} checked={checked} onCheckedChange={setChecked} />
      </div>
    );
  }

  if ((campo.tipoDato === "SELECCION" || campo.tipoDato === "CATALOGO") && campo.catalogo) {
    return (
      <div className="space-y-1">
        <Label htmlFor={id}>
          {label}
          {campo.obligatorio && <span className="text-destructive"> *</span>}
        </Label>
        <Select name={name} defaultValue={defaultValue}>
          <SelectTrigger id={id} className="w-full">
            <SelectValue placeholder={`Selecciona ${campo.catalogo.nombre.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            {campo.catalogo.valores.map((valor) => (
              <SelectItem key={valor.id} value={valor.id}>
                {valor.valor}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  const inputType =
    campo.tipoDato === "NUMERO_ENTERO" || campo.tipoDato === "NUMERO_DECIMAL"
      ? "number"
      : campo.tipoDato === "FECHA"
        ? "date"
        : campo.tipoDato === "URL"
          ? "url"
          : "text";

  return (
    <div className="space-y-1">
      <Label htmlFor={id}>
        {label}
        {campo.obligatorio && <span className="text-destructive"> *</span>}
      </Label>
      <Input
        id={id}
        name={name}
        type={inputType}
        step={campo.tipoDato === "NUMERO_ENTERO" ? "1" : campo.tipoDato === "NUMERO_DECIMAL" ? "0.01" : undefined}
        defaultValue={defaultValue}
        required={campo.obligatorio}
      />
    </div>
  );
}
