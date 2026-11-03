import { z } from 'zod';
import { db, TABLAS_DATOS, type TablaDatos, type ZaviroDB } from './db';
import { ajusteEsquema } from './esquemas';
import { ESQUEMA_POR_TABLA } from './repositorio';

/**
 * Respaldo completo en JSON: todas las tablas y los ajustes. Al importar se valida cada
 * registro con los mismos esquemas Zod que usa la app; si algo no es válido no se importa nada.
 */

export const FORMATO_RESPALDO = 'zaviro-respaldo';
export const VERSION_RESPALDO = 1;

export interface Respaldo {
  formato: typeof FORMATO_RESPALDO;
  version: number;
  exportadoEn: string;
  datos: Partial<Record<TablaDatos, unknown[]>>;
  ajustes: { clave: string; valor?: unknown }[];
}

export async function exportarRespaldo(base: ZaviroDB = db, ahora = new Date()): Promise<Respaldo> {
  const datos: Partial<Record<TablaDatos, unknown[]>> = {};
  for (const t of TABLAS_DATOS) datos[t] = await base[t].toArray();
  return {
    formato: FORMATO_RESPALDO,
    version: VERSION_RESPALDO,
    exportadoEn: ahora.toISOString(),
    datos,
    ajustes: await base.ajustes.toArray(),
  };
}

export function nombreArchivoRespaldo(ahora = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `zaviro-respaldo-${ahora.getFullYear()}-${p(ahora.getMonth() + 1)}-${p(ahora.getDate())}.json`;
}

export interface ProblemaRespaldo {
  tabla: string;
  indice?: number;
  mensaje: string;
}

export type ResultadoValidacion =
  | { valido: true; respaldo: Respaldo; conteo: Record<TablaDatos, number> }
  | { valido: false; problemas: ProblemaRespaldo[] };

const cabecera = z.object({
  formato: z.literal(FORMATO_RESPALDO),
  version: z.number().int().min(1),
  exportadoEn: z.string(),
  datos: z.record(z.unknown()),
  ajustes: z.array(z.unknown()).default([]),
});

/** Revisa un respaldo leído de un archivo. Devuelve hasta 20 problemas para mostrarlos. */
export function validarRespaldo(entrada: unknown): ResultadoValidacion {
  const c = cabecera.safeParse(entrada);
  if (!c.success)
    return {
      valido: false,
      problemas: [{ tabla: 'archivo', mensaje: 'No es un respaldo de Zaviro o está incompleto.' }],
    };
  if (c.data.version > VERSION_RESPALDO)
    return {
      valido: false,
      problemas: [
        {
          tabla: 'archivo',
          mensaje: 'El respaldo viene de una versión más nueva de Zaviro. Actualiza la app.',
        },
      ],
    };
  const problemas: ProblemaRespaldo[] = [];
  const datos: Partial<Record<TablaDatos, unknown[]>> = {};
  const conteo = Object.fromEntries(TABLAS_DATOS.map((t) => [t, 0])) as Record<TablaDatos, number>;
  for (const [tabla, filas] of Object.entries(c.data.datos)) {
    if (!(TABLAS_DATOS as readonly string[]).includes(tabla)) {
      problemas.push({ tabla, mensaje: 'Tabla desconocida.' });
      continue;
    }
    if (!Array.isArray(filas)) {
      problemas.push({ tabla, mensaje: 'Debe ser una lista de registros.' });
      continue;
    }
    const t = tabla as TablaDatos;
    const esquema = ESQUEMA_POR_TABLA[t];
    const validas: unknown[] = [];
    filas.forEach((fila, indice) => {
      const r = esquema.safeParse(fila);
      if (r.success) validas.push(r.data);
      else
        problemas.push({
          tabla,
          indice,
          mensaje: r.error.issues
            .slice(0, 2)
            .map((i) => `${i.path.join('.') || 'registro'}: ${i.message}`)
            .join('; '),
        });
    });
    datos[t] = validas;
    conteo[t] = validas.length;
  }
  const ajustes = z.array(ajusteEsquema).safeParse(c.data.ajustes);
  if (!ajustes.success)
    problemas.push({ tabla: 'ajustes', mensaje: 'Los ajustes no tienen el formato esperado.' });
  if (problemas.length) return { valido: false, problemas: problemas.slice(0, 20) };
  return {
    valido: true,
    conteo,
    respaldo: {
      formato: FORMATO_RESPALDO,
      version: c.data.version,
      exportadoEn: c.data.exportadoEn,
      datos,
      ajustes: ajustes.success ? (ajustes.data as Respaldo['ajustes']) : [],
    },
  };
}

/**
 * Importa un respaldo ya validado.
 * - reemplazar: borra todo lo que hay y deja exactamente lo del respaldo.
 * - combinar: agrega lo del respaldo; si un registro tiene el mismo id, gana el del respaldo.
 */
export async function importarRespaldo(
  respaldo: Respaldo,
  modo: 'reemplazar' | 'combinar',
  base: ZaviroDB = db,
): Promise<number> {
  let total = 0;
  await base.transaction('rw', [...TABLAS_DATOS.map((t) => base[t]), base.ajustes], async () => {
    if (modo === 'reemplazar') {
      for (const t of TABLAS_DATOS) await base[t].clear();
      await base.ajustes.clear();
    }
    for (const t of TABLAS_DATOS) {
      const filas = respaldo.datos[t] ?? [];
      if (filas.length) {
        await (base[t] as unknown as { bulkPut: (v: unknown[]) => Promise<unknown> }).bulkPut(
          filas,
        );
        total += filas.length;
      }
    }
    if (respaldo.ajustes.length) await base.ajustes.bulkPut(respaldo.ajustes);
  });
  return total;
}
