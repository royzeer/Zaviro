import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

/** Convierte el valor de un <input type="date"> (aaaa-mm-dd) a ISO, al mediodía local para evitar saltos de zona horaria. */
export function fechaInputAIso(valor: string): string | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return undefined;
  const d = new Date(`${valor}T12:00:00`);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

export function isoAFechaInput(iso: string | undefined): string {
  return iso ? format(parseISO(iso), 'yyyy-MM-dd') : '';
}

export function fechaCorta(iso: string): string {
  return format(parseISO(iso), "d 'de' MMM", { locale: es });
}

export function fechaLarga(iso: string): string {
  return format(parseISO(iso), "EEEE d 'de' MMMM", { locale: es });
}

/** "hoy", "mañana", "en 5 días", "hace 2 días". */
export function distanciaDias(iso: string, hoy = new Date()): string {
  const d = differenceInCalendarDays(parseISO(iso), hoy);
  if (d === 0) return 'hoy';
  if (d === 1) return 'mañana';
  if (d === -1) return 'ayer';
  return d > 0 ? `en ${d} días` : `hace ${-d} días`;
}

/** Formatea una nota con los decimales de la escala y coma decimal. */
export function formatoNota(n: number, decimales = 1): string {
  return n.toFixed(decimales).replace('.', ',');
}
