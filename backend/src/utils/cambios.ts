// Validación de los cambios que el navegador envía para sincronizar.
// La API no conoce la forma de cada registro (eso lo valida la app con Zod):
// solo revisa que cada cambio tenga tabla, id y un objeto de datos razonable.
import { AppError } from './respuesta';

export const MAX_CAMBIOS_POR_ENVIO = 200;
export const MAX_BYTES_POR_REGISTRO = 512 * 1024;
const TABLA_REGEX = /^[a-zA-Z][a-zA-Z0-9]{0,39}$/;

export interface Cambio {
  tabla: string;
  id: string;
  /** null indica que el registro se borró. */
  datos: Record<string, unknown> | null;
}

function esObjetoPlano(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Convierte el cuerpo de la petición en una lista de cambios válidos, o lanza un error 422. */
export function validarCambios(cuerpo: unknown): Cambio[] {
  const lista = esObjetoPlano(cuerpo) ? cuerpo.cambios : undefined;
  if (!Array.isArray(lista)) throw new AppError('Falta la lista de cambios', 422);
  if (lista.length > MAX_CAMBIOS_POR_ENVIO) {
    throw new AppError(`Envía máximo ${MAX_CAMBIOS_POR_ENVIO} cambios a la vez`, 413);
  }

  // Si un mismo registro llega dos veces, vale el último.
  const porClave = new Map<string, Cambio>();
  lista.forEach((c, i) => {
    const donde = `Cambio ${i + 1}`;
    if (!esObjetoPlano(c)) throw new AppError(`${donde}: no es un objeto`, 422);
    const { tabla, id, datos } = c;
    if (typeof tabla !== 'string' || !TABLA_REGEX.test(tabla)) {
      throw new AppError(`${donde}: la tabla no es válida`, 422);
    }
    if (typeof id !== 'string' || id.length < 1 || id.length > 100) {
      throw new AppError(`${donde}: el id no es válido`, 422);
    }
    if (datos !== null && !esObjetoPlano(datos)) {
      throw new AppError(`${donde}: los datos deben ser un objeto o null`, 422);
    }
    if (datos && Buffer.byteLength(JSON.stringify(datos)) > MAX_BYTES_POR_REGISTRO) {
      throw new AppError(`${donde}: el registro es demasiado grande`, 413);
    }
    porClave.set(`${tabla}\u0000${id}`, { tabla, id, datos: datos ?? null });
  });
  return [...porClave.values()];
}

/** Lee el parámetro `desde` (última revisión que ya tiene el navegador). */
export function leerDesde(valor: unknown): number {
  if (valor === undefined || valor === '') return 0;
  const n = Number(valor);
  if (!Number.isSafeInteger(n) || n < 0) throw new AppError('El parámetro desde no es válido', 422);
  return n;
}
