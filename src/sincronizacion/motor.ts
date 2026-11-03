// Sincronización entre IndexedDB (este dispositivo) y la cuenta en el servidor.
// 1) Sube los registros pendientes leyendo su valor actual (si ya no existe, sube un borrado).
// 2) Trae lo que cambió en otros dispositivos desde la última revisión conocida.
// Si un registro tiene un cambio local sin subir, el local gana y se sube en la próxima vuelta.
import type { Table } from 'dexie';
import { TABLAS_DATOS, type TablaDatos, type ZaviroDB } from '@/db/db';
import { ajusteEsquema } from '@/db/esquemas';
import { ESQUEMA_POR_TABLA } from '@/db/repositorio';
import { escribir, leer } from './almacen';
import { hayPendiente, listarPendientes, quitarPendientes, type Pendiente } from './pendientes';
import { marcarTransaccionRemota } from './rastreo';

/** Tablas que viajan al servidor: los datos del estudiante y sus ajustes. */
export const TABLAS_SINCRONIZADAS = [...TABLAS_DATOS, 'ajustes'] as const;
export type TablaSincronizada = (typeof TABLAS_SINCRONIZADAS)[number];

export const MAX_CAMBIOS_POR_ENVIO = 100;
const MAX_BYTES_POR_ENVIO = 2 * 1024 * 1024;

export interface CambioRemoto {
  tabla: string;
  id: string;
  datos: Record<string, unknown> | null;
}

export interface ApiSincronizacion {
  enviar(cambios: CambioRemoto[]): Promise<{ revision: number }>;
  traer(desde: number): Promise<{
    cambios: (CambioRemoto & { revision: number })[];
    revision: number;
    hayMas: boolean;
  }>;
}

const CLAVE_REVISION = 'zaviro-revision';

export function revisionLocal(): number | null {
  const t = leer(CLAVE_REVISION);
  return t === null ? null : Number(t) || 0;
}

export function guardarRevisionLocal(revision: number | null) {
  escribir(CLAVE_REVISION, revision === null ? null : String(revision));
}

function esSincronizada(tabla: string): tabla is TablaSincronizada {
  return (TABLAS_SINCRONIZADAS as readonly string[]).includes(tabla);
}

function tablaDe(base: ZaviroDB, tabla: TablaSincronizada) {
  return base[tabla] as unknown as Table<Record<string, unknown>, string>;
}

/** Revisa con Zod lo que llega del servidor; lo que no cumple el esquema no se guarda. */
export function registroValido(tabla: TablaSincronizada, datos: unknown) {
  const esquema = tabla === 'ajustes' ? ajusteEsquema : ESQUEMA_POR_TABLA[tabla as TablaDatos];
  return esquema.safeParse(datos).success;
}

/** Arma los envíos respetando el máximo de cambios y de tamaño por petición. */
export function agruparEnvios<T extends { datos: unknown }>(cambios: T[]): T[][] {
  const grupos: T[][] = [];
  let actual: T[] = [];
  let bytes = 0;
  for (const c of cambios) {
    const tam = JSON.stringify(c.datos ?? null).length;
    if (
      actual.length &&
      (actual.length >= MAX_CAMBIOS_POR_ENVIO || bytes + tam > MAX_BYTES_POR_ENVIO)
    ) {
      grupos.push(actual);
      actual = [];
      bytes = 0;
    }
    actual.push(c);
    bytes += tam;
  }
  if (actual.length) grupos.push(actual);
  return grupos;
}

/** Sube los cambios pendientes. Devuelve cuántos se subieron. */
export async function subirPendientes(base: ZaviroDB, api: ApiSincronizacion): Promise<number> {
  const pendientes = listarPendientes().filter((p) => esSincronizada(p.tabla));
  const conDatos: (CambioRemoto & { pendiente: Pendiente })[] = [];
  for (const p of pendientes) {
    const valor = await tablaDe(base, p.tabla as TablaSincronizada).get(p.id);
    conDatos.push({ tabla: p.tabla, id: p.id, datos: valor ?? null, pendiente: p });
  }
  // Los pendientes de tablas que ya no existen se descartan.
  quitarPendientes(listarPendientes().filter((p) => !esSincronizada(p.tabla)));

  let subidos = 0;
  for (const grupo of agruparEnvios(conDatos)) {
    await api.enviar(grupo.map(({ tabla, id, datos }) => ({ tabla, id, datos })));
    quitarPendientes(grupo.map((c) => c.pendiente));
    subidos += grupo.length;
  }
  return subidos;
}

/** Guarda en IndexedDB una página de cambios del servidor. Devuelve cuántos se aplicaron. */
export async function aplicarCambiosRemotos(base: ZaviroDB, cambios: CambioRemoto[]) {
  let aplicados = 0;
  await base.transaction(
    'rw',
    TABLAS_SINCRONIZADAS.map((t) => tablaDe(base, t)),
    async () => {
      marcarTransaccionRemota();
      for (const c of cambios) {
        if (!esSincronizada(c.tabla) || hayPendiente(c.tabla, c.id)) continue;
        const tabla = tablaDe(base, c.tabla);
        if (c.datos === null) {
          await tabla.delete(c.id);
        } else {
          if (!registroValido(c.tabla, c.datos)) continue;
          await tabla.put(c.datos);
        }
        aplicados++;
      }
    },
  );
  return aplicados;
}

/** Trae todo lo que cambió desde la última revisión conocida. */
export async function traerCambios(base: ZaviroDB, api: ApiSincronizacion): Promise<number> {
  let desde = revisionLocal() ?? 0;
  let aplicados = 0;
  for (;;) {
    const pagina = await api.traer(desde);
    aplicados += await aplicarCambiosRemotos(base, pagina.cambios);
    desde = pagina.revision;
    guardarRevisionLocal(desde);
    if (!pagina.hayMas) break;
  }
  return aplicados;
}

export async function sincronizar(base: ZaviroDB, api: ApiSincronizacion) {
  const subidos = await subirPendientes(base, api);
  const traidos = await traerCambios(base, api);
  return { subidos, traidos };
}

/** Borra los datos de este dispositivo sin anotarlos como borrados para el servidor. */
export async function borrarDatosLocales(base: ZaviroDB) {
  await base.transaction(
    'rw',
    TABLAS_SINCRONIZADAS.map((t) => tablaDe(base, t)),
    async () => {
      marcarTransaccionRemota();
      for (const t of TABLAS_SINCRONIZADAS) await tablaDe(base, t).clear();
    },
  );
}
