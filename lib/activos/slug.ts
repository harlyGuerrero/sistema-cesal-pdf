const COMBINING_DIACRITICS = /[̀-ͯ]/g;

// Slug técnico para unicidad/orden de CategoriaActivo y SubcategoriaActivo
// (Fase 3) — nunca se muestra al usuario, se deriva del nombre en el server
// action. No confundir con normalizeName (mayúsculas, para Activo/Product).
export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(COMBINING_DIACRITICS, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
