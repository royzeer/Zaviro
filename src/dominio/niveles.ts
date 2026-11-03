import type { Reglas } from '@/db/esquemas';
import type { Modulo, Nivel } from './catalogo';

/**
 * Reglas sugeridas por nivel. Son solo un punto de partida: cada institución
 * define las suyas y el estudiante puede cambiarlas todas desde la interfaz.
 * Nada de lo que está aquí se usa como regla fija en los cálculos; los cálculos
 * siempre leen las reglas guardadas en el perfil.
 */

export const MODULOS_BASE: Modulo[] = [
  'materias',
  'apuntes',
  'errores',
  'arbol',
  'repaso',
  'notas',
  'plan',
  'ejemplos',
];

const MODULOS_EXTRA: Record<Nivel, Modulo[]> = {
  bachillerato: ['saber11'],
  tecnico: ['saberPro'],
  tecnologo: ['saberPro'],
  profesional: ['saberPro'],
  especializacion: ['trabajoGrado', 'lecturas'],
  maestria: ['trabajoGrado', 'lecturas'],
  doctorado: ['trabajoGrado', 'lecturas', 'bitacora'],
};

/** Módulos que tiene sentido ofrecer en cada nivel (los que el usuario puede activar). */
export function modulosDisponibles(nivel: Nivel): Modulo[] {
  return [...MODULOS_BASE, ...MODULOS_EXTRA[nivel]];
}

/** Módulos activos por defecto al crear un perfil. Saber Pro / TyT es opcional y arranca apagado. */
export function modulosSugeridos(nivel: Nivel): Modulo[] {
  const extra = MODULOS_EXTRA[nivel].filter((m) => m !== 'saberPro');
  const base = nivel === 'doctorado' ? MODULOS_BASE.filter((m) => m !== 'notas') : MODULOS_BASE;
  return [...base, ...extra];
}

const ESCALA_0_5 = { minimo: 0, maximo: 5, aprobatoria: 3, decimales: 1 };

const CORTES_PREGRADO = [
  { nombre: 'Corte 1', peso: 30 },
  { nombre: 'Corte 2', peso: 30 },
  { nombre: 'Corte 3', peso: 40 },
];

/** Horas de trabajo del estudiante por crédito académico en Colombia. */
export const HORAS_POR_CREDITO = 48;

export function reglasSugeridas(nivel: Nivel): Reglas {
  switch (nivel) {
    case 'bachillerato':
      return {
        usaNotas: true,
        escala: { minimo: 1, maximo: 5, aprobatoria: 3, decimales: 1 },
        // Los rangos de cada categoría los fija el colegio en su sistema de evaluación;
        // se dejan vacíos para que el estudiante los ingrese.
        categoriasDesempeno: ['Superior', 'Alto', 'Básico', 'Bajo'].map((nombre) => ({
          nombre,
          desde: null,
          hasta: null,
        })),
        evaluacion: {
          tipo: 'periodos',
          componentes: [1, 2, 3, 4].map((n) => ({ nombre: `Período ${n}`, peso: 25 })),
        },
        creditos: {
          activados: false,
          horasPorCredito: HORAS_POR_CREDITO,
          proporcionDocente: 1 / 3,
        },
        promedio: {
          notaMinimaMateria: 3,
          ponderadoPorCreditos: false,
          promedioAcumuladoMinimo: null,
        },
        repaso: { intervalosIniciales: [1, 2] },
      };
    case 'tecnico':
    case 'tecnologo':
      return {
        usaNotas: true,
        escala: { ...ESCALA_0_5 },
        categoriasDesempeno: [],
        evaluacion: {
          tipo: 'evidencias',
          componentes: [
            { nombre: 'Evidencias de conocimiento', peso: 30 },
            { nombre: 'Evidencias de desempeño', peso: 35 },
            { nombre: 'Evidencias de producto', peso: 35 },
          ],
        },
        creditos: {
          activados: false,
          horasPorCredito: HORAS_POR_CREDITO,
          proporcionDocente: 1 / 3,
        },
        promedio: {
          notaMinimaMateria: 3,
          ponderadoPorCreditos: false,
          promedioAcumuladoMinimo: null,
        },
        repaso: { intervalosIniciales: [1, 3] },
      };
    case 'profesional':
      return {
        usaNotas: true,
        escala: { ...ESCALA_0_5 },
        categoriasDesempeno: [],
        evaluacion: { tipo: 'cortes', componentes: CORTES_PREGRADO.map((c) => ({ ...c })) },
        creditos: { activados: true, horasPorCredito: HORAS_POR_CREDITO, proporcionDocente: 1 / 3 },
        promedio: {
          notaMinimaMateria: 3,
          ponderadoPorCreditos: true,
          promedioAcumuladoMinimo: null,
        },
        repaso: { intervalosIniciales: [1, 4] },
      };
    case 'especializacion':
    case 'maestria':
      return {
        usaNotas: true,
        escala: { ...ESCALA_0_5, aprobatoria: 3.5 },
        categoriasDesempeno: [],
        evaluacion: { tipo: 'cortes', componentes: CORTES_PREGRADO.map((c) => ({ ...c })) },
        creditos: { activados: true, horasPorCredito: HORAS_POR_CREDITO, proporcionDocente: 1 / 4 },
        promedio: {
          notaMinimaMateria: 3.5,
          ponderadoPorCreditos: true,
          promedioAcumuladoMinimo: 3.5,
        },
        repaso: { intervalosIniciales: [2, 6] },
      };
    case 'doctorado':
      return {
        usaNotas: false,
        escala: { ...ESCALA_0_5, aprobatoria: 3.5 },
        categoriasDesempeno: [],
        evaluacion: {
          tipo: 'hitos',
          componentes: [
            { nombre: 'Propuesta', peso: 0 },
            { nombre: 'Examen de candidatura', peso: 0 },
            { nombre: 'Avances', peso: 0 },
            { nombre: 'Sustentación', peso: 0 },
          ],
        },
        creditos: { activados: true, horasPorCredito: HORAS_POR_CREDITO, proporcionDocente: 1 / 6 },
        promedio: {
          notaMinimaMateria: 3.5,
          ponderadoPorCreditos: true,
          promedioAcumuladoMinimo: null,
        },
        repaso: { intervalosIniciales: [3, 7] },
      };
  }
}

/** Vocabulario de la interfaz ajustado a cada nivel. */
export interface Vocabulario {
  materia: string;
  materias: string;
  /** Texto del botón para crear, con el género correcto. */
  nuevaMateria: string;
  componente: string;
  componentes: string;
  parcial: string;
  logro: string;
  /** Texto de ayuda sobre cómo se evalúa en este nivel. */
  ayudaEvaluacion: string;
  /** Texto de ayuda sobre la nota mínima y el promedio. */
  ayudaPromedio: string;
}

export function vocabulario(nivel: Nivel): Vocabulario {
  switch (nivel) {
    case 'bachillerato':
      return {
        materia: 'Materia',
        materias: 'Materias',
        nuevaMateria: 'Nueva materia',
        componente: 'Período',
        componentes: 'Períodos',
        parcial: 'evaluación',
        logro: 'Logro',
        ayudaEvaluacion:
          'Cada colegio decide cuántos períodos tiene el año y cuánto pesa cada uno. Revisa el sistema institucional de evaluación (SIEE) de tu colegio.',
        ayudaPromedio:
          'La equivalencia con la escala nacional (Superior, Alto, Básico y Bajo) la define tu colegio. Escribe los rangos tal como aparecen en tu boletín.',
      };
    case 'tecnico':
    case 'tecnologo':
      return {
        materia: 'Materia o competencia',
        materias: 'Materias y competencias',
        nuevaMateria: 'Nueva materia o competencia',
        componente: 'Evidencia',
        componentes: 'Evidencias',
        parcial: 'evaluación',
        logro: 'Resultado de aprendizaje',
        ayudaEvaluacion:
          'Se evalúa por evidencias o actividades, cada una con su estado. Si tu programa usa notas numéricas, ajusta los pesos a lo que diga tu instructor o docente.',
        ayudaPromedio:
          'La nota aprobatoria y el uso de créditos dependen de la institución. Actívalos solo si tu programa los usa.',
      };
    case 'profesional':
      return {
        materia: 'Materia',
        materias: 'Materias',
        nuevaMateria: 'Nueva materia',
        componente: 'Corte',
        componentes: 'Cortes',
        parcial: 'parcial',
        logro: 'Objetivo',
        ayudaEvaluacion:
          'Los cortes y sus porcentajes los fija cada docente en el programa de la materia. Puedes cambiarlos en cada materia.',
        ayudaPromedio:
          'El promedio ponderado multiplica cada nota por los créditos de la materia. El promedio mínimo para no quedar en prueba académica lo fija el reglamento estudiantil de tu universidad.',
      };
    case 'especializacion':
    case 'maestria':
      return {
        materia: 'Curso',
        materias: 'Cursos',
        nuevaMateria: 'Nuevo curso',
        componente: 'Corte',
        componentes: 'Cortes',
        parcial: 'entrega',
        logro: 'Objetivo',
        ayudaEvaluacion:
          'En posgrado la evaluación suele ser por entregas, ensayos y proyectos. Ajusta los cortes de cada curso según su programa.',
        ayudaPromedio:
          'Muchas universidades piden 3.5 como nota mínima por curso y como promedio acumulado en posgrado, pero varía. Confírmalo en el reglamento de tu programa y cámbialo aquí si es distinto.',
      };
    case 'doctorado':
      return {
        materia: 'Seminario',
        materias: 'Seminarios',
        nuevaMateria: 'Nuevo seminario',
        componente: 'Hito',
        componentes: 'Hitos',
        parcial: 'entrega',
        logro: 'Objetivo de investigación',
        ayudaEvaluacion:
          'El doctorado se organiza por hitos de investigación y lecturas. Las notas vienen apagadas; actívalas si tus seminarios se califican.',
        ayudaPromedio:
          'Si tus seminarios tienen nota, define aquí la nota mínima que exige tu programa.',
      };
  }
}

/** Horas totales, con docente e independientes que implica una materia según sus créditos. */
export function horasDeMateria(creditos: number, reglas: Reglas) {
  if (!reglas.creditos.activados || creditos <= 0) return null;
  const total = creditos * reglas.creditos.horasPorCredito;
  const conDocente = total * reglas.creditos.proporcionDocente;
  return { total, conDocente, independientes: total - conDocente };
}

/** Suma de pesos de los componentes de evaluación (debe dar 100 cuando se usan notas). */
export function sumaPesos(componentes: { peso: number }[]): number {
  return Math.round(componentes.reduce((s, c) => s + c.peso, 0) * 100) / 100;
}

/**
 * Categoría de desempeño para una nota (por ejemplo Superior, Alto, Básico, Bajo).
 * Devuelve undefined si el colegio aún no tiene los rangos configurados.
 */
export function categoriaDeNota(nota: number, reglas: Reglas): string | undefined {
  return reglas.categoriasDesempeno.find(
    (c) => c.desde !== null && c.hasta !== null && nota >= c.desde && nota <= c.hasta,
  )?.nombre;
}

/** Problemas de configuración que la interfaz debe mostrar antes de guardar las reglas. */
export function revisarReglas(reglas: Reglas): string[] {
  const avisos: string[] = [];
  const { minimo, maximo, aprobatoria } = reglas.escala;
  if (minimo >= maximo) avisos.push('La nota mínima de la escala debe ser menor que la máxima.');
  if (aprobatoria < minimo || aprobatoria > maximo)
    avisos.push('La nota aprobatoria debe estar dentro de la escala.');
  if (reglas.usaNotas && reglas.evaluacion.componentes.length > 0) {
    const suma = sumaPesos(reglas.evaluacion.componentes);
    if (suma !== 100) avisos.push(`Los pesos de evaluación suman ${suma}% y deben sumar 100%.`);
  }
  const n = reglas.promedio.notaMinimaMateria;
  if (n < minimo || n > maximo)
    avisos.push('La nota mínima por materia debe estar dentro de la escala.');
  const acum = reglas.promedio.promedioAcumuladoMinimo;
  if (acum !== null && (acum < minimo || acum > maximo))
    avisos.push('El promedio acumulado mínimo debe estar dentro de la escala.');
  for (const c of reglas.categoriasDesempeno) {
    if ((c.desde === null) !== (c.hasta === null))
      avisos.push(`Completa los dos extremos del rango "${c.nombre}".`);
    if (c.desde !== null && c.hasta !== null) {
      if (c.desde > c.hasta)
        avisos.push(`En "${c.nombre}" el inicio del rango es mayor que el final.`);
      if (c.desde < minimo || c.hasta > maximo)
        avisos.push(`El rango "${c.nombre}" se sale de la escala.`);
    }
  }
  const rangos = reglas.categoriasDesempeno
    .filter((c) => c.desde !== null && c.hasta !== null)
    .sort((a, b) => (a.desde as number) - (b.desde as number));
  for (let i = 1; i < rangos.length; i++) {
    if ((rangos[i]!.desde as number) <= (rangos[i - 1]!.hasta as number))
      avisos.push(`Los rangos "${rangos[i - 1]!.nombre}" y "${rangos[i]!.nombre}" se cruzan.`);
  }
  return avisos;
}
