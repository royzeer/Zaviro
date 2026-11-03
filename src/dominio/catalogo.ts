/**
 * Catálogo base de niveles académicos y áreas, según la estructura de la
 * educación en Colombia. Aquí solo viven identificadores, nombres y orden;
 * las reglas por defecto (editables) se definen aparte.
 */

export const NIVELES = [
  'bachillerato',
  'tecnico',
  'tecnologo',
  'profesional',
  'especializacion',
  'maestria',
  'doctorado',
] as const;

export type Nivel = (typeof NIVELES)[number];

export const NOMBRE_NIVEL: Record<Nivel, string> = {
  bachillerato: 'Bachillerato',
  tecnico: 'Técnico profesional',
  tecnologo: 'Tecnólogo',
  profesional: 'Profesional universitario',
  especializacion: 'Especialización',
  maestria: 'Maestría',
  doctorado: 'Doctorado',
};

/** Profundidad del nivel: sirve para comparar si una raíz viene de un nivel anterior. */
export const ORDEN_NIVEL: Record<Nivel, number> = {
  bachillerato: 1,
  tecnico: 2,
  tecnologo: 3,
  profesional: 4,
  especializacion: 5,
  maestria: 6,
  doctorado: 7,
};

export function esNivelAnterior(origen: Nivel, actual: Nivel): boolean {
  return ORDEN_NIVEL[origen] < ORDEN_NIVEL[actual];
}

export const AREAS = [
  'ingenieria',
  'naturales',
  'programacion',
  'salud',
  'sociales',
  'arte',
] as const;

export type Area = (typeof AREAS)[number];

export const NOMBRE_AREA: Record<Area, string> = {
  ingenieria: 'Ingeniería y ciencias exactas',
  naturales: 'Ciencias naturales y ambientales',
  programacion: 'Programación y software',
  salud: 'Ciencias de la salud',
  sociales: 'Ciencias sociales, económicas y humanas',
  arte: 'Arte y diseño',
};

export const MODULOS = [
  'materias',
  'apuntes',
  'errores',
  'arbol',
  'repaso',
  'notas',
  'plan',
  'ejemplos',
  'saber11',
  'saberPro',
  'trabajoGrado',
  'lecturas',
  'bitacora',
] as const;

export type Modulo = (typeof MODULOS)[number];

export const TIPOS_MATERIA = ['cuantitativa', 'teorica', 'laboratorio', 'programacion'] as const;
export type TipoMateria = (typeof TIPOS_MATERIA)[number];

export const TIPOS_ERROR = [
  'concepto',
  'procedimiento',
  'calculo',
  'lectura',
  'descuido',
] as const;
export type TipoError = (typeof TIPOS_ERROR)[number];

export const NOMBRE_TIPO_ERROR: Record<TipoError, string> = {
  concepto: 'Concepto',
  procedimiento: 'Procedimiento',
  calculo: 'Cálculo',
  lectura: 'Lectura del enunciado',
  descuido: 'Descuido',
};

export const ESTADOS_LECTURA = ['porLeer', 'leyendo', 'leida'] as const;
export type EstadoLectura = (typeof ESTADOS_LECTURA)[number];

export const ESTADOS_HITO = ['pendiente', 'enCurso', 'entregado', 'aprobado'] as const;
export type EstadoHito = (typeof ESTADOS_HITO)[number];

export const PRUEBAS_SABER11 = [
  'lecturaCritica',
  'matematicas',
  'socialesCiudadanas',
  'cienciasNaturales',
  'ingles',
] as const;
export type PruebaSaber11 = (typeof PRUEBAS_SABER11)[number];
