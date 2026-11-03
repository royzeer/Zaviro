import { z } from 'zod';
import {
  AREAS,
  ESTADOS_EVIDENCIA,
  ESTADOS_HITO,
  ESTADOS_MATERIA,
  ESTADOS_LECTURA,
  MODULOS,
  NIVELES,
  PRUEBAS_SABER11,
  TIPOS_ERROR,
  TIPOS_MATERIA,
} from '@/dominio/catalogo';

/**
 * Esquemas Zod de todas las entidades. Todo lo que entra a la base de datos
 * (formularios, importación de respaldos) pasa por aquí.
 * Las fechas se guardan como texto ISO 8601 para que el respaldo JSON sea legible.
 */

const id = z.string().min(1);
const fechaIso = z.string().datetime({ offset: true });
const nota = z.number().finite();
/** Marca los registros de ejemplo para poder borrarlos con un botón. */
const esEjemplo = z.boolean().optional();

export const nivelEsquema = z.enum(NIVELES);
export const areaEsquema = z.enum(AREAS);
export const moduloEsquema = z.enum(MODULOS);

export const escalaEsquema = z
  .object({
    minimo: nota,
    maximo: nota,
    aprobatoria: nota,
    decimales: z.number().int().min(0).max(3),
  })
  .refine((e) => e.minimo < e.maximo, { message: 'El mínimo debe ser menor que el máximo' })
  .refine((e) => e.aprobatoria >= e.minimo && e.aprobatoria <= e.maximo, {
    message: 'La nota aprobatoria debe estar dentro de la escala',
  });

/** Categorías de desempeño (por ejemplo Superior, Alto, Básico, Bajo). Los rangos los define la institución. */
export const categoriaDesempenoEsquema = z.object({
  nombre: z.string().min(1),
  /** null mientras el estudiante no haya ingresado el rango que fija su colegio. */
  desde: nota.nullable(),
  hasta: nota.nullable(),
});

export const componenteEvaluacionEsquema = z.object({
  nombre: z.string().min(1),
  peso: z.number().min(0).max(100),
});

export const reglasEsquema = z.object({
  usaNotas: z.boolean(),
  escala: escalaEsquema,
  categoriasDesempeno: z.array(categoriaDesempenoEsquema),
  evaluacion: z.object({
    tipo: z.enum(['periodos', 'cortes', 'evidencias', 'hitos']),
    componentes: z.array(componenteEvaluacionEsquema),
  }),
  creditos: z.object({
    activados: z.boolean(),
    horasPorCredito: z.number().positive(),
    /** Fracción de las horas de cada crédito que es con docente (el resto es trabajo independiente). */
    proporcionDocente: z.number().min(0).max(1),
  }),
  promedio: z.object({
    notaMinimaMateria: nota,
    ponderadoPorCreditos: z.boolean(),
    promedioAcumuladoMinimo: nota.nullable(),
  }),
  repaso: z.object({
    /** Intervalos iniciales en días para las primeras repeticiones. */
    intervalosIniciales: z.array(z.number().positive()).min(1),
  }),
});

export const perfilEsquema = z.object({
  id,
  nivel: nivelEsquema,
  area: areaEsquema,
  institucion: z.string(),
  programa: z.string().optional(),
  reglas: reglasEsquema,
  modulosActivos: z.array(moduloEsquema),
  /** Total de créditos del programa (para seguir el avance en pregrado). */
  creditosPrograma: z.number().int().min(0).optional(),
  creadoEn: fechaIso,
  esEjemplo,
});

export const corteMateriaEsquema = z.object({
  nombre: z.string().min(1),
  peso: z.number().min(0).max(100),
  nota: nota.optional(),
  fecha: fechaIso.optional(),
  /** Para evidencias o actividades (técnico y tecnólogo). */
  estado: z.enum(ESTADOS_EVIDENCIA).optional(),
});

export const materiaEsquema = z.object({
  id,
  perfilId: id,
  nombre: z.string().min(1),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  creditos: z.number().min(0).optional(),
  fechaParcial: fechaIso.optional(),
  tipo: z.enum(TIPOS_MATERIA),
  cortes: z.array(corteMateriaEsquema),
  prerrequisitos: z.array(id).optional(),
  periodoAcademico: z.string().optional(),
  estado: z.enum(ESTADOS_MATERIA).optional(),
  /** Meta propia de nota final (opcional, para la calculadora). */
  meta: nota.optional(),
  /** Nota final registrada a mano cuando la materia ya terminó (para el promedio acumulado). */
  notaFinal: nota.optional(),
  esEjemplo,
});

export const temaEsquema = z.object({
  id,
  materiaId: id,
  titulo: z.string().min(1),
  pesoParcial: z.number().min(0).max(100),
  dominio: z.number().min(0).max(1),
  esEjemplo,
});

export const conceptoRaizEsquema = z.object({
  id,
  nombre: z.string().min(1),
  descripcion: z.string(),
  nivelOrigen: nivelEsquema,
  temaIds: z.array(id),
  esEjemplo,
});

export const apunteEsquema = z.object({
  id,
  materiaId: id,
  temaId: id.optional(),
  titulo: z.string().optional(),
  contenido: z.string(),
  fecha: fechaIso,
  esEjemplo,
});

export const errorEsquema = z.object({
  id,
  materiaId: id,
  temaId: id,
  tipo: z.enum(TIPOS_ERROR),
  enunciado: z.string(),
  miRespuesta: z.string(),
  solucionCorrecta: z.string(),
  conceptoIds: z.array(id),
  fecha: fechaIso,
  resuelto: z.boolean(),
  esEjemplo,
});

export const tarjetaEsquema = z.object({
  id,
  /** apunte, error, raíz (repaso corto de una base) o manual. */
  origenTipo: z.enum(['apunte', 'error', 'raiz', 'manual']),
  origenId: id,
  temaId: id.optional(),
  frente: z.string().min(1),
  reverso: z.string(),
  facilidad: z.number().min(1.3),
  intervalo: z.number().min(0),
  repeticiones: z.number().int().min(0),
  proximoRepaso: fechaIso,
  esEjemplo,
});

export const repasoEsquema = z.object({
  id,
  tarjetaId: id,
  temaId: id.optional(),
  fecha: fechaIso,
  calificacion: z.enum(['olvide', 'dificil', 'bien', 'facil']),
  esEjemplo,
});

/** Sesión de estudio marcada como hecha desde el plan. */
export const sesionEsquema = z.object({
  id,
  temaId: id,
  fecha: fechaIso,
  horas: z.number().positive().max(24),
  esEjemplo,
});

export const ejemploResueltoEsquema = z.object({
  id,
  temaId: id,
  titulo: z.string().min(1),
  enunciado: z.string(),
  pasos: z.array(
    z.object({
      descripcion: z.string(),
      valor: z.string().optional(),
    }),
  ),
  comprobacion: z.string(),
  esEjemplo,
});

export const simulacroSaber11Esquema = z.object({
  id,
  perfilId: id,
  fecha: fechaIso,
  puntajes: z.record(z.enum(PRUEBAS_SABER11), z.number().min(0).max(100)),
  puntajeGlobal: z.number().min(0).max(500),
  esEjemplo,
});

export const hitoEsquema = z.object({
  id,
  perfilId: id,
  titulo: z.string().min(1),
  fecha: fechaIso.optional(),
  estado: z.enum(ESTADOS_HITO),
  notas: z.string(),
  esEjemplo,
});

export const lecturaEsquema = z.object({
  id,
  perfilId: id,
  referencia: z.string().min(1),
  estado: z.enum(ESTADOS_LECTURA),
  notas: z.string(),
  citas: z.array(
    z.object({ texto: z.string().min(1), fuente: z.string(), pagina: z.string().optional() }),
  ),
  esEjemplo,
});

export const ajusteEsquema = z.object({
  clave: z.string().min(1),
  valor: z.unknown(),
});

export type Reglas = z.infer<typeof reglasEsquema>;
export type PerfilAcademico = z.infer<typeof perfilEsquema>;
export type Materia = z.infer<typeof materiaEsquema>;
export type CorteMateria = z.infer<typeof corteMateriaEsquema>;
export type Tema = z.infer<typeof temaEsquema>;
export type ConceptoRaiz = z.infer<typeof conceptoRaizEsquema>;
export type Apunte = z.infer<typeof apunteEsquema>;
export type ErrorRegistrado = z.infer<typeof errorEsquema>;
export type TarjetaRepaso = z.infer<typeof tarjetaEsquema>;
export type Repaso = z.infer<typeof repasoEsquema>;
export type SesionEstudio = z.infer<typeof sesionEsquema>;
export type EjemploResuelto = z.infer<typeof ejemploResueltoEsquema>;
export type SimulacroSaber11 = z.infer<typeof simulacroSaber11Esquema>;
export type HitoTrabajoGrado = z.infer<typeof hitoEsquema>;
export type Lectura = z.infer<typeof lecturaEsquema>;
export type Ajuste = z.infer<typeof ajusteEsquema>;
