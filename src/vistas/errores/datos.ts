import { db } from '@/db/db';
import type { Nivel } from '@/dominio/catalogo';

/** Carga todo lo necesario para cruzar errores entre materias y perfiles. */
export async function cargarDatosErrores() {
  const [perfiles, materias, temas, errores, conceptos] = await Promise.all([
    db.perfiles.toArray(),
    db.materias.toArray(),
    db.temas.toArray(),
    db.errores.orderBy('fecha').reverse().toArray(),
    db.conceptosRaiz.toArray(),
  ]);
  const nivelPorPerfil = new Map(perfiles.map((p) => [p.id, p.nivel]));
  const nivelPorMateria = new Map<string, Nivel>();
  for (const m of materias) {
    const n = nivelPorPerfil.get(m.perfilId);
    if (n) nivelPorMateria.set(m.id, n);
  }
  conceptos.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  return { perfiles, materias, temas, errores, conceptos, nivelPorMateria };
}

export type DatosErrores = Awaited<ReturnType<typeof cargarDatosErrores>>;
