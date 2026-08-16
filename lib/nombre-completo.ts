// Fase 35: Usuario y Responsable separaron su campo único "nombre" en
// "nombres" + "apellidos" — este helper concatena para mostrar en pantalla
// (tablas, avatares, breadcrumb, auditoría), sin duplicar esa lógica en
// cada archivo que necesita mostrar el nombre completo de una persona.
export function nombreCompleto(persona: { nombres: string; apellidos: string }): string {
  return [persona.nombres, persona.apellidos].filter(Boolean).join(" ");
}

// Iniciales para el avatar: primera letra de nombres + primera letra de
// apellidos (ej. "Pedro Estrada" -> "PE"). Si apellidos está vacío
// (registros migrados antes de completarse, ver Fase 35), cae a las
// primeras 2 letras de nombres — mismo criterio que ya usaba el avatar
// cuando todo el nombre vivía en un solo campo.
export function inicialesPersona(persona: { nombres: string; apellidos: string }): string {
  if (persona.apellidos) {
    return `${persona.nombres.charAt(0)}${persona.apellidos.charAt(0)}`;
  }
  return persona.nombres.slice(0, 2);
}
