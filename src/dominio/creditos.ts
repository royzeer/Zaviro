import type { Materia } from '@/db/esquemas';

/** Avance de créditos aprobados frente al total del programa. */
export function avanceCreditos(materias: Materia[], creditosPrograma?: number) {
  const suma = (estado: Materia['estado']) =>
    materias.filter((m) => m.estado === estado).reduce((s, m) => s + (m.creditos ?? 0), 0);
  const aprobados = suma('aprobada');
  const cursando =
    suma('cursando') + materias.filter((m) => !m.estado).reduce((s, m) => s + (m.creditos ?? 0), 0);
  const total = creditosPrograma && creditosPrograma > 0 ? creditosPrograma : undefined;
  return {
    aprobados,
    cursando,
    total,
    faltan: total !== undefined ? Math.max(0, total - aprobados) : undefined,
    porcentaje: total !== undefined ? Math.min(1, aprobados / total) : undefined,
  };
}

/** Prerrequisitos de una materia que todavía no están aprobados. */
export function prerrequisitosPendientes(materia: Materia, todas: Materia[]): Materia[] {
  const porId = new Map(todas.map((m) => [m.id, m]));
  return (materia.prerrequisitos ?? [])
    .map((id) => porId.get(id))
    .filter((m): m is Materia => m !== undefined && m.estado !== 'aprobada');
}

/**
 * Indica si agregar `prerrequisitoId` como prerrequisito de `materiaId`
 * crearía un ciclo (A pide B y B, directa o indirectamente, pide A).
 */
export function creaCiclo(materiaId: string, prerrequisitoId: string, todas: Materia[]): boolean {
  if (materiaId === prerrequisitoId) return true;
  const porId = new Map(todas.map((m) => [m.id, m]));
  const pila = [prerrequisitoId];
  const vistos = new Set<string>();
  while (pila.length > 0) {
    const actual = pila.pop()!;
    if (actual === materiaId) return true;
    if (vistos.has(actual)) continue;
    vistos.add(actual);
    pila.push(...(porId.get(actual)?.prerrequisitos ?? []));
  }
  return false;
}
