// Registros cambiados en este dispositivo que todavía no se han subido.
// Se guardan en localStorage porque se escriben de forma síncrona dentro de las
// transacciones de IndexedDB, y así sobreviven si se cierra la pestaña.
import { escribirJson, leerJson } from './almacen';

const CLAVE = 'zaviro-pendientes';
const SEPARADOR = '\u0000';

export interface Pendiente {
  tabla: string;
  id: string;
  /** Número de cambio local: si el registro vuelve a cambiar mientras se sube, sigue pendiente. */
  marca: number;
}

let cache: Record<string, number> | null = null;
let contador = 0;
const oyentes = new Set<() => void>();

function mapa(): Record<string, number> {
  if (!cache) {
    cache = leerJson<Record<string, number>>(CLAVE) ?? {};
    contador = Math.max(0, ...Object.values(cache));
  }
  return cache;
}

function guardarMapa() {
  escribirJson(CLAVE, cache && Object.keys(cache).length ? cache : null);
  oyentes.forEach((f) => f());
}

export function marcarPendientes(tabla: string, ids: readonly string[]) {
  if (ids.length === 0) return;
  const m = mapa();
  for (const id of ids) m[`${tabla}${SEPARADOR}${id}`] = ++contador;
  guardarMapa();
}

export function listarPendientes(): Pendiente[] {
  return Object.entries(mapa()).map(([clave, marca]) => {
    const [tabla = '', id = ''] = clave.split(SEPARADOR);
    return { tabla, id, marca };
  });
}

export function hayPendiente(tabla: string, id: string): boolean {
  return `${tabla}${SEPARADOR}${id}` in mapa();
}

export function contarPendientes(): number {
  return Object.keys(mapa()).length;
}

/** Quita los pendientes ya subidos, salvo los que cambiaron otra vez mientras tanto. */
export function quitarPendientes(subidos: readonly Pendiente[]) {
  const m = mapa();
  for (const p of subidos) {
    const clave = `${p.tabla}${SEPARADOR}${p.id}`;
    if (m[clave] === p.marca) delete m[clave];
  }
  guardarMapa();
}

export function vaciarPendientes() {
  cache = {};
  guardarMapa();
}

export function alCambiarPendientes(f: () => void): () => void {
  oyentes.add(f);
  return () => oyentes.delete(f);
}

/** Solo para pruebas: olvida la copia en memoria. */
export function reiniciarCachePendientes() {
  cache = null;
}
