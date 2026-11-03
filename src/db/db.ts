import Dexie, { type EntityTable } from 'dexie';
import type {
  Ajuste,
  Apunte,
  ConceptoRaiz,
  EjemploResuelto,
  ErrorRegistrado,
  Repaso,
  SesionEstudio,
  HitoTrabajoGrado,
  Lectura,
  Materia,
  PerfilAcademico,
  SimulacroSaber11,
  TarjetaRepaso,
  Tema,
} from './esquemas';

/**
 * Base de datos local (IndexedDB). Nada sale del dispositivo.
 * Nota: IndexedDB no indexa booleanos, por eso campos como `resuelto`
 * o `esEjemplo` se filtran en memoria y no aparecen en los índices.
 */
export class ZaviroDB extends Dexie {
  perfiles!: EntityTable<PerfilAcademico, 'id'>;
  materias!: EntityTable<Materia, 'id'>;
  temas!: EntityTable<Tema, 'id'>;
  conceptosRaiz!: EntityTable<ConceptoRaiz, 'id'>;
  apuntes!: EntityTable<Apunte, 'id'>;
  errores!: EntityTable<ErrorRegistrado, 'id'>;
  tarjetas!: EntityTable<TarjetaRepaso, 'id'>;
  repasos!: EntityTable<Repaso, 'id'>;
  sesiones!: EntityTable<SesionEstudio, 'id'>;
  ejemplos!: EntityTable<EjemploResuelto, 'id'>;
  simulacros!: EntityTable<SimulacroSaber11, 'id'>;
  hitos!: EntityTable<HitoTrabajoGrado, 'id'>;
  lecturas!: EntityTable<Lectura, 'id'>;
  ajustes!: EntityTable<Ajuste, 'clave'>;

  constructor(nombre = 'zaviro') {
    super(nombre);
    this.version(1).stores({
      perfiles: 'id, nivel',
      materias: 'id, perfilId',
      temas: 'id, materiaId',
      conceptosRaiz: 'id, nivelOrigen, *temaIds',
      apuntes: 'id, materiaId, temaId, fecha',
      errores: 'id, materiaId, temaId, fecha, *conceptoIds',
      tarjetas: 'id, [origenTipo+origenId], temaId, proximoRepaso',
      ejemplos: 'id, temaId',
      simulacros: 'id, perfilId, fecha',
      hitos: 'id, perfilId, fecha',
      lecturas: 'id, perfilId, estado',
      ajustes: 'clave',
    });
    // v2: historial de repasos para calcular el dominio por tema.
    this.version(2).stores({
      repasos: 'id, tarjetaId, temaId, fecha',
    });
    // v3: sesiones de estudio hechas desde el plan.
    this.version(3).stores({
      sesiones: 'id, temaId, fecha',
    });
  }
}

export const db = new ZaviroDB();

/** Nombres de las tablas con datos del estudiante (sin ajustes). */
export const TABLAS_DATOS = [
  'perfiles',
  'materias',
  'temas',
  'conceptosRaiz',
  'apuntes',
  'errores',
  'tarjetas',
  'repasos',
  'sesiones',
  'ejemplos',
  'simulacros',
  'hitos',
  'lecturas',
] as const;

export type TablaDatos = (typeof TABLAS_DATOS)[number];
