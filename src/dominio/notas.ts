import type { CorteMateria, Materia, Reglas } from '@/db/esquemas';

/**
 * Calculadora de notas. Todo se calcula con las reglas del perfil
 * (escala, nota aprobatoria, mínimos, créditos); nada está fijo en el código.
 */

type Escala = Reglas['escala'];

/** Redondea hacia arriba a los decimales de la escala (lo que necesitas debe alcanzar). */
export function redondearArriba(n: number, decimales: number): number {
  const f = Math.pow(10, decimales);
  return Math.ceil(n * f - 1e-9) / f;
}

export function redondear(n: number, decimales: number): number {
  const f = Math.pow(10, decimales);
  return Math.round(n * f) / f;
}

export interface EstadoNota {
  /** Suma de los pesos de todos los cortes (normalmente 100). */
  pesoTotal: number;
  pesoEvaluado: number;
  pesoRestante: number;
  /** Puntos ya asegurados sobre la nota final (en la escala). */
  acumulado: number;
  /** Promedio de lo evaluado hasta ahora. null si aún no hay notas. */
  promedioEvaluado: number | null;
  /** Nota final si ya se evaluó todo. */
  final: number | null;
}

export function estadoNota(cortes: Pick<CorteMateria, 'peso' | 'nota'>[]): EstadoNota {
  const pesoTotal = cortes.reduce((s, c) => s + c.peso, 0);
  const evaluados = cortes.filter((c) => c.nota !== undefined);
  const pesoEvaluado = evaluados.reduce((s, c) => s + c.peso, 0);
  const suma = evaluados.reduce((s, c) => s + c.peso * c.nota!, 0);
  const acumulado = pesoTotal > 0 ? suma / pesoTotal : 0;
  return {
    pesoTotal,
    pesoEvaluado,
    pesoRestante: pesoTotal - pesoEvaluado,
    acumulado,
    promedioEvaluado: pesoEvaluado > 0 ? suma / pesoEvaluado : null,
    final: pesoTotal > 0 && pesoEvaluado === pesoTotal ? acumulado : null,
  };
}

export type Veredicto = 'asegurado' | 'posible' | 'imposible' | 'logrado' | 'no-logrado';

export interface Necesario {
  veredicto: Veredicto;
  /** Promedio que necesitas en lo que falta. null si ya no queda nada por evaluar o ya está asegurado. */
  nota: number | null;
}

/**
 * Cuánto necesitas, en promedio, en lo que falta para llegar a `meta`.
 * - asegurado: aunque saques la nota mínima de la escala en lo que falta, llegas.
 * - imposible: ni con la nota máxima en todo lo que falta llegas.
 */
export function necesarioPara(
  meta: number,
  cortes: Pick<CorteMateria, 'peso' | 'nota'>[],
  escala: Escala,
): Necesario {
  const e = estadoNota(cortes);
  if (e.pesoTotal <= 0) return { veredicto: 'posible', nota: null };
  if (e.pesoRestante <= 0) {
    return {
      veredicto: redondear(e.acumulado, escala.decimales) >= meta ? 'logrado' : 'no-logrado',
      nota: null,
    };
  }
  const requerido = ((meta - e.acumulado) * e.pesoTotal) / e.pesoRestante;
  if (requerido <= escala.minimo) return { veredicto: 'asegurado', nota: null };
  const nota = redondearArriba(requerido, escala.decimales);
  if (nota > escala.maximo) return { veredicto: 'imposible', nota };
  return { veredicto: 'posible', nota };
}

/** Nota con la que cuenta una materia para el promedio: la final registrada o la calculada si ya se evaluó todo. */
export function notaDeMateria(m: Pick<Materia, 'notaFinal' | 'cortes'>): number | null {
  if (m.notaFinal !== undefined) return m.notaFinal;
  return estadoNota(m.cortes).final;
}

/** Nota proyectada: la final si existe; si no, el promedio de lo evaluado hasta ahora. */
export function notaProyectada(m: Pick<Materia, 'notaFinal' | 'cortes'>): number | null {
  return notaDeMateria(m) ?? estadoNota(m.cortes).promedioEvaluado;
}

export interface ItemPromedio {
  nota: number;
  creditos: number | undefined;
}

/** Promedio simple o ponderado por créditos. Las materias sin créditos pesan 0 en el ponderado. */
export function promedio(items: ItemPromedio[], ponderadoPorCreditos: boolean): number | null {
  if (ponderadoPorCreditos) {
    const creditos = items.reduce((s, i) => s + (i.creditos ?? 0), 0);
    if (creditos <= 0) return null;
    return items.reduce((s, i) => s + i.nota * (i.creditos ?? 0), 0) / creditos;
  }
  if (items.length === 0) return null;
  return items.reduce((s, i) => s + i.nota, 0) / items.length;
}

export interface ResumenPromedio {
  semestral: number | null;
  acumulado: number | null;
  /** Promedio acumulado si las materias en curso terminan con su promedio actual. */
  proyectado: number | null;
  creditosCalificados: number;
}

/**
 * Promedio semestral (de un período académico), acumulado (todas las materias terminadas)
 * y proyectado (incluye las que van en curso con su promedio parcial).
 */
export function resumenPromedio(
  materias: Materia[],
  reglas: Reglas,
  periodo?: string,
): ResumenPromedio {
  const pond = reglas.promedio.ponderadoPorCreditos && reglas.creditos.activados;
  const cuentan = materias.filter((m) => m.estado !== 'pendiente');
  const terminadas = cuentan
    .map((m) => ({ m, nota: notaDeMateria(m) }))
    .filter(
      (x): x is { m: Materia; nota: number } =>
        x.nota !== null &&
        (x.m.estado === 'aprobada' ||
          x.m.estado === 'reprobada' ||
          x.m.notaFinal !== undefined ||
          estadoNota(x.m.cortes).final !== null),
    );
  const delPeriodo = cuentan
    .filter((m) => periodo !== undefined && m.periodoAcademico === periodo)
    .map((m) => ({ nota: notaProyectada(m), creditos: m.creditos }))
    .filter((x): x is ItemPromedio => x.nota !== null);
  const proyectadas = cuentan
    .map((m) => ({ nota: notaProyectada(m), creditos: m.creditos }))
    .filter((x): x is ItemPromedio => x.nota !== null);
  const acum = terminadas.map((x) => ({ nota: x.nota, creditos: x.m.creditos }));
  return {
    semestral: promedio(delPeriodo, pond),
    acumulado: promedio(acum, pond),
    proyectado: promedio(proyectadas, pond),
    creditosCalificados: acum.reduce((s, i) => s + (i.creditos ?? 0), 0),
  };
}

/**
 * Promedio que necesitas en las materias en curso para que el acumulado quede en `minimo`.
 * Usa créditos si el promedio es ponderado; si no, cuenta materias.
 */
export function necesarioParaPromedio(
  materias: Materia[],
  reglas: Reglas,
  minimo: number,
): Necesario {
  const pond = reglas.promedio.ponderadoPorCreditos && reglas.creditos.activados;
  const peso = (m: Materia) => (pond ? (m.creditos ?? 0) : 1);
  let suma = 0;
  let pesoHecho = 0;
  let pesoPendiente = 0;
  for (const m of materias) {
    if (m.estado === 'pendiente') continue;
    const n = notaDeMateria(m);
    if (n !== null) {
      suma += n * peso(m);
      pesoHecho += peso(m);
    } else {
      pesoPendiente += peso(m);
    }
  }
  const { escala } = reglas;
  if (pesoPendiente <= 0) {
    const actual = pesoHecho > 0 ? suma / pesoHecho : null;
    return {
      veredicto:
        actual !== null && redondear(actual, escala.decimales) >= minimo ? 'logrado' : 'no-logrado',
      nota: null,
    };
  }
  const requerido = (minimo * (pesoHecho + pesoPendiente) - suma) / pesoPendiente;
  if (requerido <= escala.minimo) return { veredicto: 'asegurado', nota: null };
  const nota = redondearArriba(requerido, escala.decimales);
  return { veredicto: nota > escala.maximo ? 'imposible' : 'posible', nota };
}
