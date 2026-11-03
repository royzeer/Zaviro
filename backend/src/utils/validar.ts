// Validaciones sencillas y reutilizables para los datos que llegan a la API.
import { AppError, type ErroresPorCampo } from './respuesta';

export const CORREO_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_CONTRASENA = 8;
export const MAX_CONTRASENA = 72; // bcrypt solo tiene en cuenta los primeros 72 bytes

/** Lanza un error 422 si hay al menos un campo con error. */
export function lanzarSiHayErrores(errores: ErroresPorCampo) {
  if (Object.keys(errores).length > 0) throw new AppError('Revisa los datos', 422, errores);
}

export function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim() : '';
}

export function contrasena(valor: unknown): string {
  return typeof valor === 'string' ? valor : '';
}

export function errorNombre(nombre: string): string | undefined {
  if (nombre.length < 2 || nombre.length > 80) return 'Escribe un nombre de 2 a 80 caracteres';
}

export function errorContrasenaNueva(clave: string): string | undefined {
  if (clave.length < MIN_CONTRASENA)
    return `La contraseña debe tener mínimo ${MIN_CONTRASENA} caracteres`;
  if (Buffer.byteLength(clave) > MAX_CONTRASENA) return 'La contraseña es demasiado larga';
}
