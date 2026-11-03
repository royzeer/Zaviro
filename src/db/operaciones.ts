import { db, type ZaviroDB } from './db';
import type {
  Apunte,
  ConceptoRaiz,
  ErrorRegistrado,
  Materia,
  PerfilAcademico,
  Reglas,
  TarjetaRepaso,
  Tema,
} from './esquemas';
import { ahoraIso, guardar, guardarAjuste, nuevoId, obtenerAjuste } from './repositorio';
import type { Area, Modulo, Nivel } from '@/dominio/catalogo';
import { calcularDominio } from '@/dominio/dominio';
import { calificarTarjeta, FACILIDAD_INICIAL, type Calificacion } from '@/dominio/repaso';

/** Operaciones de dominio sobre la base local (crear, borrar en cascada, etc.). */

export const CLAVE_PERFIL_ACTIVO = 'perfilActivoId';

export interface DatosNuevoPerfil {
  nivel: Nivel;
  area: Area;
  institucion: string;
  programa?: string;
  reglas: Reglas;
  modulosActivos: Modulo[];
  creditosPrograma?: number;
  esEjemplo?: boolean;
}

export async function crearPerfil(datos: DatosNuevoPerfil, base: ZaviroDB = db) {
  const perfil: PerfilAcademico = { id: nuevoId(), creadoEn: ahoraIso(), ...datos };
  await guardar('perfiles', perfil, base);
  await guardarAjuste(CLAVE_PERFIL_ACTIVO, perfil.id, base);
  return perfil;
}

/** Devuelve el perfil activo; si el guardado ya no existe, usa el primero disponible. */
export async function perfilActivo(base: ZaviroDB = db): Promise<PerfilAcademico | undefined> {
  const id = await obtenerAjuste<string>(CLAVE_PERFIL_ACTIVO, base);
  const perfil = id ? await base.perfiles.get(id) : undefined;
  return perfil ?? (await base.perfiles.orderBy('id').first());
}

export async function activarPerfil(id: string, base: ZaviroDB = db) {
  await guardarAjuste(CLAVE_PERFIL_ACTIVO, id, base);
}

/** Borra una materia con sus temas, apuntes, errores, tarjetas y ejemplos. */
export async function borrarMateria(materiaId: string, base: ZaviroDB = db) {
  await base.transaction(
    'rw',
    [
      base.materias,
      base.temas,
      base.apuntes,
      base.errores,
      base.tarjetas,
      base.repasos,
      base.sesiones,
      base.ejemplos,
      base.conceptosRaiz,
    ],
    async () => {
      const temaIds = await base.temas.where('materiaId').equals(materiaId).primaryKeys();
      for (const t of temaIds) await borrarTemaInterno(t, base);
      const apunteIds = await base.apuntes.where('materiaId').equals(materiaId).primaryKeys();
      const errorIds = await base.errores.where('materiaId').equals(materiaId).primaryKeys();
      await borrarTarjetasDe('apunte', apunteIds, base);
      await borrarTarjetasDe('error', errorIds, base);
      await base.apuntes.bulkDelete(apunteIds);
      await base.errores.bulkDelete(errorIds);
      // Ninguna otra materia puede tener esta como prerrequisito.
      await base.materias
        .filter((m) => m.prerrequisitos?.includes(materiaId) ?? false)
        .modify((m) => {
          m.prerrequisitos = m.prerrequisitos?.filter((p) => p !== materiaId);
        });
      await base.materias.delete(materiaId);
    },
  );
}

async function borrarTarjetasDe(tipo: 'apunte' | 'error', ids: string[], base: ZaviroDB) {
  if (ids.length === 0) return;
  const tarjetaIds = await base.tarjetas
    .where('[origenTipo+origenId]')
    .anyOf(ids.map((i) => [tipo, i]))
    .primaryKeys();
  await base.repasos.where('tarjetaId').anyOf(tarjetaIds).delete();
  await base.tarjetas.bulkDelete(tarjetaIds);
}

/** Borra una tarjeta y su historial de repasos. */
export async function borrarTarjeta(id: string, base: ZaviroDB = db) {
  await base.transaction('rw', [base.tarjetas, base.repasos], async () => {
    await base.repasos.where('tarjetaId').equals(id).delete();
    await base.tarjetas.delete(id);
  });
}

async function borrarTemaInterno(temaId: string, base: ZaviroDB) {
  await base.ejemplos.where('temaId').equals(temaId).delete();
  await base.apuntes
    .where('temaId')
    .equals(temaId)
    .modify((a) => {
      delete a.temaId;
    });
  const errorIds = await base.errores.where('temaId').equals(temaId).primaryKeys();
  await borrarTarjetasDe('error', errorIds, base);
  await base.errores.bulkDelete(errorIds);
  await base.tarjetas.where('temaId').equals(temaId).delete();
  await base.repasos.where('temaId').equals(temaId).delete();
  await base.sesiones.where('temaId').equals(temaId).delete();
  await base.conceptosRaiz
    .where('temaIds')
    .equals(temaId)
    .modify((c) => {
      c.temaIds = c.temaIds.filter((t) => t !== temaId);
    });
  await base.temas.delete(temaId);
}

/** Borra un tema; sus apuntes se conservan en la materia, sin tema. */
export async function borrarTema(temaId: string, base: ZaviroDB = db) {
  await base.transaction(
    'rw',
    [
      base.temas,
      base.apuntes,
      base.errores,
      base.tarjetas,
      base.repasos,
      base.sesiones,
      base.ejemplos,
      base.conceptosRaiz,
    ],
    () => borrarTemaInterno(temaId, base),
  );
}

/** Borra un perfil con todas sus materias y sus módulos propios. */
export async function borrarPerfil(perfilId: string, base: ZaviroDB = db) {
  const materiaIds = await base.materias.where('perfilId').equals(perfilId).primaryKeys();
  for (const m of materiaIds) await borrarMateria(m, base);
  await base.transaction(
    'rw',
    [base.perfiles, base.simulacros, base.hitos, base.lecturas, base.ajustes],
    async () => {
      await base.simulacros.where('perfilId').equals(perfilId).delete();
      await base.hitos.where('perfilId').equals(perfilId).delete();
      await base.lecturas.where('perfilId').equals(perfilId).delete();
      await base.perfiles.delete(perfilId);
      const activo = await obtenerAjuste<string>(CLAVE_PERFIL_ACTIVO, base);
      if (activo === perfilId) {
        const otro = await base.perfiles.orderBy('id').first();
        if (otro) await guardarAjuste(CLAVE_PERFIL_ACTIVO, otro.id, base);
        else await base.ajustes.delete(CLAVE_PERFIL_ACTIVO);
      }
    },
  );
}

/** Cortes iniciales de una materia nueva, copiados de las reglas del perfil. */
export function cortesIniciales(reglas: Reglas): Materia['cortes'] {
  if (reglas.evaluacion.tipo === 'hitos') return [];
  return reglas.evaluacion.componentes.map((c) => ({
    nombre: c.nombre,
    peso: c.peso,
    ...(reglas.evaluacion.tipo === 'evidencias' ? { estado: 'pendiente' as const } : {}),
  }));
}

export const COLORES_MATERIA = [
  '#8b6f52',
  '#2e7d3c',
  '#3d6b8c',
  '#a85c2a',
  '#7a5c8e',
  '#b8862f',
  '#4f7d74',
  '#9c4a5a',
];

export async function materiasDePerfil(perfilId: string, base: ZaviroDB = db): Promise<Materia[]> {
  const lista = await base.materias.where('perfilId').equals(perfilId).toArray();
  return lista.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

export async function temasDeMaterias(materiaIds: string[], base: ZaviroDB = db): Promise<Tema[]> {
  if (materiaIds.length === 0) return [];
  return base.temas.where('materiaId').anyOf(materiaIds).toArray();
}

export async function apuntesDeMaterias(
  materiaIds: string[],
  base: ZaviroDB = db,
): Promise<Apunte[]> {
  if (materiaIds.length === 0) return [];
  const lista = await base.apuntes.where('materiaId').anyOf(materiaIds).toArray();
  return lista.sort((a, b) => b.fecha.localeCompare(a.fecha));
}

/**
 * Guarda un error y enlaza sus conceptos raíz con el tema, para que el árbol
 * sepa qué raíces sostienen cada hoja.
 */
export async function registrarError(error: ErrorRegistrado, base: ZaviroDB = db) {
  await base.transaction('rw', [base.errores, base.conceptosRaiz], async () => {
    await guardar('errores', error, base);
    for (const id of error.conceptoIds) {
      const c = await base.conceptosRaiz.get(id);
      if (c && !c.temaIds.includes(error.temaId)) {
        await guardar('conceptosRaiz', { ...c, temaIds: [...c.temaIds, error.temaId] }, base);
      }
    }
  });
  return error;
}

export async function crearConcepto(
  datos: Pick<ConceptoRaiz, 'nombre' | 'nivelOrigen'> &
    Partial<Pick<ConceptoRaiz, 'descripcion' | 'temaIds'>>,
  base: ZaviroDB = db,
) {
  const nombre = datos.nombre.trim();
  const existente = await base.conceptosRaiz
    .filter((c) => c.nombre.toLowerCase() === nombre.toLowerCase())
    .first();
  if (existente) return existente;
  return guardar(
    'conceptosRaiz',
    { id: nuevoId(), descripcion: '', temaIds: [], ...datos, nombre },
    base,
  );
}

/** Borra un concepto raíz y lo quita de los errores que lo mencionaban. */
export async function borrarConcepto(id: string, base: ZaviroDB = db) {
  await base.transaction('rw', [base.conceptosRaiz, base.errores], async () => {
    await base.errores
      .where('conceptoIds')
      .equals(id)
      .modify((e) => {
        e.conceptoIds = e.conceptoIds.filter((c) => c !== id);
      });
    await base.conceptosRaiz.delete(id);
  });
}

export async function borrarError(id: string, base: ZaviroDB = db) {
  await base.transaction('rw', [base.errores, base.tarjetas, base.repasos], async () => {
    await borrarTarjetasDe('error', [id], base);
    await base.errores.delete(id);
  });
}

/** Crea una tarjeta nueva, lista para repasar de inmediato. */
export async function crearTarjeta(
  datos: Pick<TarjetaRepaso, 'origenTipo' | 'origenId' | 'frente' | 'reverso'> & {
    temaId?: string;
  },
  base: ZaviroDB = db,
) {
  const { temaId, ...resto } = datos;
  return guardar(
    'tarjetas',
    {
      id: nuevoId(),
      ...resto,
      ...(temaId ? { temaId } : {}),
      facilidad: FACILIDAD_INICIAL,
      intervalo: 0,
      repeticiones: 0,
      proximoRepaso: ahoraIso(),
    },
    base,
  );
}

/** Recalcula y guarda el dominio de un tema a partir de sus repasos, tarjetas y errores. */
export async function recalcularDominio(temaId: string, ahora = new Date(), base: ZaviroDB = db) {
  const tema = await base.temas.get(temaId);
  if (!tema) return;
  const [repasos, tarjetas, errores] = await Promise.all([
    base.repasos.where('temaId').equals(temaId).toArray(),
    base.tarjetas.where('temaId').equals(temaId).toArray(),
    base.errores.where('temaId').equals(temaId).toArray(),
  ]);
  const dominio = calcularDominio({ repasos, tarjetas, errores }, ahora);
  if (dominio !== tema.dominio) await base.temas.update(temaId, { dominio });
  return dominio;
}

/** Recalcula el dominio de todos los temas (se usa al abrir la app para reflejar el paso del tiempo). */
export async function recalcularDominios(ahora = new Date(), base: ZaviroDB = db) {
  const ids = await base.temas.toCollection().primaryKeys();
  for (const id of ids) await recalcularDominio(id, ahora, base);
}

/** Registra un repaso: aplica SM-2 a la tarjeta, guarda el historial y actualiza el dominio del tema. */
export async function registrarRepaso(
  tarjeta: TarjetaRepaso,
  calificacion: Calificacion,
  reglas: Pick<Reglas, 'repaso'>,
  ahora = new Date(),
  base: ZaviroDB = db,
) {
  const actualizada = calificarTarjeta(tarjeta, calificacion, reglas, ahora);
  await base.transaction(
    'rw',
    [base.tarjetas, base.repasos, base.temas, base.errores],
    async () => {
      await guardar('tarjetas', actualizada, base);
      await guardar(
        'repasos',
        {
          id: nuevoId(),
          tarjetaId: tarjeta.id,
          ...(tarjeta.temaId ? { temaId: tarjeta.temaId } : {}),
          fecha: ahora.toISOString(),
          calificacion,
          ...(tarjeta.esEjemplo ? { esEjemplo: true } : {}),
        },
        base,
      );
      if (tarjeta.temaId) await recalcularDominio(tarjeta.temaId, ahora, base);
    },
  );
  return actualizada;
}
