import { differenceInCalendarDays, parseISO } from 'date-fns';
import type { ConceptoRaiz, ErrorRegistrado } from '@/db/esquemas';
import { esNivelAnterior, type Nivel } from './catalogo';

/**
 * Raíces compartidas: puntúa cada concepto raíz sumando los errores enlazados
 * de todas las materias y perfiles. Los errores recientes y los no resueltos pesan más.
 */

export interface OpcionesRaices {
  /** Días para que un error pese la mitad. */
  vidaMediaDias: number;
  /** Peso de un error ya resuelto frente a uno pendiente. */
  pesoResuelto: number;
}

export const OPCIONES_RAICES: OpcionesRaices = { vidaMediaDias: 21, pesoResuelto: 0.3 };

/** Peso de un error según su antigüedad y si está resuelto. */
export function pesoError(
  error: Pick<ErrorRegistrado, 'fecha' | 'resuelto'>,
  ahora: Date,
  opciones: OpcionesRaices = OPCIONES_RAICES,
): number {
  const dias = Math.max(0, differenceInCalendarDays(ahora, parseISO(error.fecha)));
  const recencia = Math.pow(0.5, dias / opciones.vidaMediaDias);
  return recencia * (error.resuelto ? opciones.pesoResuelto : 1);
}

export interface RaizPuntuada {
  concepto: ConceptoRaiz;
  puntaje: number;
  errores: number;
  noResueltos: number;
  materiaIds: string[];
  /** Niveles de los perfiles donde ocurrieron los errores. */
  nivelesAfectados: Nivel[];
  /** true si algún error viene de un nivel superior al de origen de la raíz. */
  basePendiente: boolean;
}

export function puntuarRaices(params: {
  conceptos: ConceptoRaiz[];
  errores: ErrorRegistrado[];
  /** Nivel del perfil al que pertenece cada materia. */
  nivelPorMateria: Map<string, Nivel>;
  ahora?: Date;
  opciones?: OpcionesRaices;
}): RaizPuntuada[] {
  const {
    conceptos,
    errores,
    nivelPorMateria,
    ahora = new Date(),
    opciones = OPCIONES_RAICES,
  } = params;
  const resultado = conceptos.map((concepto) => {
    const enlazados = errores.filter((e) => e.conceptoIds.includes(concepto.id));
    const niveles = new Set<Nivel>();
    for (const e of enlazados) {
      const n = nivelPorMateria.get(e.materiaId);
      if (n) niveles.add(n);
    }
    const nivelesAfectados = [...niveles];
    return {
      concepto,
      puntaje: enlazados.reduce((s, e) => s + pesoError(e, ahora, opciones), 0),
      errores: enlazados.length,
      noResueltos: enlazados.filter((e) => !e.resuelto).length,
      materiaIds: [...new Set(enlazados.map((e) => e.materiaId))],
      nivelesAfectados,
      basePendiente: enlazados.some((e) => {
        const n = nivelPorMateria.get(e.materiaId);
        return !e.resuelto && n !== undefined && esNivelAnterior(concepto.nivelOrigen, n);
      }),
    };
  });
  return resultado
    .filter((r) => r.errores > 0)
    .sort(
      (a, b) =>
        b.puntaje - a.puntaje ||
        b.materiaIds.length - a.materiaIds.length ||
        a.concepto.nombre.localeCompare(b.concepto.nombre, 'es'),
    );
}

/** Minutos sugeridos para el repaso corto de una base de un nivel anterior. */
export function minutosRepasoBase(raiz: Pick<RaizPuntuada, 'noResueltos' | 'materiaIds'>): number {
  return Math.min(
    45,
    15 + 5 * Math.max(0, raiz.noResueltos - 1) + 5 * Math.max(0, raiz.materiaIds.length - 1),
  );
}

/** Temas con errores no resueltos en los últimos días: son los que "fallan" en el árbol. */
export function temasQueFallan(
  errores: ErrorRegistrado[],
  ahora = new Date(),
  dias = 14,
): Set<string> {
  return new Set(
    errores
      .filter((e) => !e.resuelto && differenceInCalendarDays(ahora, parseISO(e.fecha)) <= dias)
      .map((e) => e.temaId),
  );
}
