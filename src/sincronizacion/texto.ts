import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export type EstadoSincronizacion = 'inactivo' | 'sincronizando' | 'sinConexion' | 'error';

/** Texto corto del estado de la sincronización. */
export function textoSincronizacion(
  s: { estado: EstadoSincronizacion; ultima: string | null; pendientes: number },
  ahora = new Date(),
): string {
  if (s.estado === 'sincronizando') return 'Sincronizando…';
  const faltan =
    s.pendientes > 0
      ? ` ${s.pendientes === 1 ? 'Queda 1 cambio' : `Quedan ${s.pendientes} cambios`} por subir.`
      : '';
  if (s.estado === 'sinConexion') return `Sin conexión con el servidor.${faltan}`;
  if (s.estado === 'error') return `No se pudo sincronizar.${faltan}`;
  if (!s.ultima) return `Aún no se ha sincronizado.${faltan}`;
  const hace = formatDistanceToNow(new Date(s.ultima), { locale: es, addSuffix: true });
  return `Todo guardado en tu cuenta ${ahora.getTime() - new Date(s.ultima).getTime() < 60_000 ? 'hace un momento' : hace}.${faltan}`;
}

/** Versión de pocas palabras, para la barra lateral. */
export function textoSincronizacionCorto(s: {
  estado: EstadoSincronizacion;
  pendientes: number;
}): string {
  if (s.estado === 'sincronizando') return 'Sincronizando…';
  if (s.estado === 'sinConexion')
    return s.pendientes ? `Sin conexión, ${s.pendientes} por subir` : 'Sin conexión';
  if (s.estado === 'error') return 'Error al sincronizar';
  return s.pendientes ? `${s.pendientes} cambios por subir` : 'Guardado en tu cuenta';
}
