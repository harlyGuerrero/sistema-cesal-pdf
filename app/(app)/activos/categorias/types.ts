export interface SubcategoriaData {
  id: string;
  nombre: string;
  _count: { campos: number };
}

export interface CategoriaData {
  id: string;
  nombre: string;
  _count: { subcategorias: number };
  subcategorias: SubcategoriaData[];
}
