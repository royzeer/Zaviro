import type { z } from 'zod';
import { db, TABLAS_DATOS, type TablaDatos, type ZaviroDB } from './db';
import {
  apunteEsquema,
  conceptoRaizEsquema,
  ejemploResueltoEsquema,
  errorEsquema,
  hitoEsquema,
  lecturaEsquema,
  materiaEsquema,
  perfilEsquema,
  repasoEsquema,
  sesionEsquema,
  simulacroSaber11Esquema,
  tarjetaEsquema,
  temaEsquema,
} from './esquemas';

/** Esquema que valida cada tabla antes de escribir. */
export const ESQUEMA_POR_TABLA = {
  perfiles: perfilEsquema,
  materias: materiaEsquema,
  temas: temaEsquema,
  conceptosRaiz: conceptoRaizEsquema,
  apuntes: apunteEsquema,
  errores: errorEsquema,
  tarjetas: tarjetaEsquema,
  repasos: repasoEsquema,
  sesiones: sesionEsquema,
  ejemplos: ejemploResueltoEsquema,
  simulacros: simulacroSaber11Esquema,
  hitos: hitoEsquema,
  lecturas: lecturaEsquema,
} satisfies Record<TablaDatos, z.ZodTypeAny>;

export type EntidadDe<T extends TablaDatos> = z.infer<(typeof ESQUEMA_POR_TABLA)[T]>;

export function nuevoId(): string {
  return crypto.randomUUID();
}

export function ahoraIso(): string {
  return new Date().toISOString();
}

/** Valida con Zod y guarda (inserta o reemplaza). Lanza un ZodError si los datos no son válidos. */
export async function guardar<T extends TablaDatos>(
  tabla: T,
  entidad: EntidadDe<T>,
  base: ZaviroDB = db,
): Promise<EntidadDe<T>> {
  const valida = ESQUEMA_POR_TABLA[tabla].parse(entidad) as EntidadDe<T>;
  await (base[tabla] as unknown as { put: (v: unknown) => Promise<unknown> }).put(valida);
  return valida;
}

export async function obtenerAjuste<T>(clave: string, base: ZaviroDB = db): Promise<T | undefined> {
  const fila = await base.ajustes.get(clave);
  return fila?.valor as T | undefined;
}

export async function guardarAjuste(clave: string, valor: unknown, base: ZaviroDB = db) {
  await base.ajustes.put({ clave, valor });
}

/** Cuenta los registros de todas las tablas de datos. */
export async function contarTodo(base: ZaviroDB = db): Promise<Record<TablaDatos, number>> {
  const pares = await Promise.all(
    TABLAS_DATOS.map(async (t) => [t, await base[t].count()] as const),
  );
  return Object.fromEntries(pares) as Record<TablaDatos, number>;
}

/** Borra todos los registros marcados como datos de ejemplo, en una sola transacción. */
export async function borrarDatosEjemplo(base: ZaviroDB = db): Promise<number> {
  let borrados = 0;
  await base.transaction(
    'rw',
    TABLAS_DATOS.map((t) => base[t]),
    async () => {
      for (const t of TABLAS_DATOS) {
        const tabla = base[t] as unknown as {
          filter: (f: (v: { esEjemplo?: boolean }) => boolean) => { delete: () => Promise<number> };
        };
        borrados += await tabla.filter((v) => v.esEjemplo === true).delete();
      }
    },
  );
  return borrados;
}
