import type { Materia, Reglas, Tema } from '@/db/esquemas';

/**
 * Rendimiento de estudio: dónde una hora da más puntos.
 * puntos por hora = peso del tema en el parcial × (1 − dominio) / horas estimadas.
 */

/** Horas base de un tema cuando los créditos están apagados: de 2 h (peso 0) a 8 h (peso 100). */
export function horasSinCreditos(pesoParcial: number): number {
  return 2 + (6 * Math.min(100, Math.max(0, pesoParcial))) / 100;
}

/** Peso (en %) del próximo corte sin nota de la materia: la parte del período que cubre el próximo examen. */
export function pesoProximoCorte(materia: Pick<Materia, 'cortes'>): number | null {
  const siguiente = materia.cortes.find((c) => c.nota === undefined);
  if (!siguiente) return null;
  const total = materia.cortes.reduce((s, c) => s + c.peso, 0);
  return total > 0 ? (siguiente.peso / total) * 100 : null;
}

/**
 * Horas de estudio que merece un tema para el próximo examen.
 * Con créditos: horas de trabajo independiente de la materia (créditos × horas por crédito × parte independiente),
 * la fracción del período que cubre el próximo corte, repartida entre los temas según su peso.
 * Sin créditos: una estimación según el peso del tema.
 */
export function horasEstimadas(
  tema: Pick<Tema, 'pesoParcial' | 'id'>,
  materia: Pick<Materia, 'creditos' | 'cortes'>,
  temasDeMateria: Pick<Tema, 'pesoParcial'>[],
  reglas: Pick<Reglas, 'creditos'>,
): number {
  const { creditos } = reglas;
  if (creditos.activados && materia.creditos && materia.creditos > 0) {
    const independientes =
      materia.creditos * creditos.horasPorCredito * (1 - creditos.proporcionDocente);
    const fraccionCorte = (pesoProximoCorte(materia) ?? 100) / 100;
    const sumaPesos = temasDeMateria.reduce((s, t) => s + t.pesoParcial, 0);
    const fraccionTema =
      sumaPesos > 0 ? tema.pesoParcial / sumaPesos : 1 / Math.max(1, temasDeMateria.length);
    return Math.max(0.5, Math.round(independientes * fraccionCorte * fraccionTema * 10) / 10);
  }
  return horasSinCreditos(tema.pesoParcial);
}

export interface RendimientoTema {
  tema: Tema;
  materia: Materia;
  horas: number;
  /** Horas que faltan para dominarlo, según su dominio actual. */
  horasPendientes: number;
  puntosPorHora: number;
}

export function rendimientoDeEstudio(
  temas: Tema[],
  materias: Materia[],
  reglas: Pick<Reglas, 'creditos'>,
): RendimientoTema[] {
  const porId = new Map(materias.map((m) => [m.id, m]));
  const porMateria = new Map<string, Tema[]>();
  for (const t of temas) porMateria.set(t.materiaId, [...(porMateria.get(t.materiaId) ?? []), t]);
  return temas
    .map((tema) => {
      const materia = porId.get(tema.materiaId);
      if (!materia || materia.estado === 'aprobada' || materia.estado === 'reprobada') return null;
      const horas = horasEstimadas(tema, materia, porMateria.get(tema.materiaId) ?? [], reglas);
      const falta = 1 - Math.min(1, Math.max(0, tema.dominio));
      return {
        tema,
        materia,
        horas,
        horasPendientes: Math.round(horas * falta * 10) / 10,
        puntosPorHora: Math.round(((tema.pesoParcial * falta) / horas) * 100) / 100,
      };
    })
    .filter((r): r is RendimientoTema => r !== null)
    .sort(
      (a, b) =>
        b.puntosPorHora - a.puntosPorHora || a.tema.titulo.localeCompare(b.tema.titulo, 'es'),
    );
}
