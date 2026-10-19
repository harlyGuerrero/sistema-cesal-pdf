"use client";

import { useMemo } from "react";
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
} from "@/components/ui/combobox";

export interface ComboboxOption {
  value: string;
  // Texto que se muestra en el input una vez elegido y contra el que se
  // filtra la búsqueda — ej. "Laptop" se busca también por "Cómputo".
  label: string;
  // Texto del item dentro del grupo; si falta se usa `label`.
  itemLabel?: string;
}

export interface ComboboxOptionGroup {
  label: string;
  items: ComboboxOption[];
}

// Patrón "Combobox Groups" de shadcn sobre Base UI. Con `name` el Combobox
// renderiza un input oculto con el `value` elegido, así que sirve igual en
// un <form> con FormData o en un form GET server-side.
export function GroupedCombobox({
  groups,
  name,
  id,
  value,
  defaultValue,
  onValueChange,
  placeholder,
  emptyMessage = "Sin resultados.",
  required,
  disabled,
  className,
}: {
  groups: ComboboxOptionGroup[];
  name?: string;
  id?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  emptyMessage?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const optionByValue = useMemo(
    () => new Map(groups.flatMap((group) => group.items.map((item) => [item.value, item] as const))),
    [groups]
  );

  // Controlado solo si el padre pasa `value`; si no, no controlado con
  // `defaultValue` (mismo contrato que el Select que reemplaza).
  const selection =
    value !== undefined
      ? { value: optionByValue.get(value) ?? null }
      : { defaultValue: defaultValue ? (optionByValue.get(defaultValue) ?? null) : null };

  return (
    <Combobox<ComboboxOption>
      items={groups}
      name={name}
      id={id}
      required={required}
      disabled={disabled}
      {...selection}
      onValueChange={(option) => onValueChange?.(option?.value ?? "")}
      itemToStringLabel={(option) => option.label}
      itemToStringValue={(option) => option.value}
      isItemEqualToValue={(option, selected) => option.value === selected.value}
    >
      <ComboboxInput placeholder={placeholder} disabled={disabled} className={className} />
      <ComboboxContent>
        <ComboboxEmpty>{emptyMessage}</ComboboxEmpty>
        <ComboboxList>
          {(group: ComboboxOptionGroup) => (
            <ComboboxGroup key={group.label} items={group.items}>
              <ComboboxLabel>{group.label}</ComboboxLabel>
              <ComboboxCollection>
                {(option: ComboboxOption) => (
                  <ComboboxItem key={option.value} value={option}>
                    {option.itemLabel ?? option.label}
                  </ComboboxItem>
                )}
              </ComboboxCollection>
            </ComboboxGroup>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
