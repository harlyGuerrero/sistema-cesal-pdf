import type { ComboboxOptionGroup } from "@/components/grouped-combobox";

// Árbol mínimo Tipo → Categoría → Subcategoría que ya cargan los formularios
// de Activos y la página de Campos.
export interface SubcategoriaTree {
  name: string;
  categorias: { nombre: string; subcategorias: { id: string; nombre: string }[] }[];
}

// Un grupo por categoría (rotulado con su tipo de activo), así la búsqueda
// encuentra una subcategoría tanto por su nombre como por el de su categoría.
export function subcategoriaGroups(tiposActivo: SubcategoriaTree[]): ComboboxOptionGroup[] {
  return tiposActivo.flatMap((tipo) =>
    tipo.categorias
      .filter((categoria) => categoria.subcategorias.length > 0)
      .map((categoria) => ({
        label: `${tipo.name} · ${categoria.nombre}`,
        items: categoria.subcategorias.map((subcategoria) => ({
          value: subcategoria.id,
          label: `${categoria.nombre} › ${subcategoria.nombre}`,
          itemLabel: subcategoria.nombre,
        })),
      }))
  );
}
