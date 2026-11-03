import { differenceInCalendarDays, format, parseISO, startOfDay } from 'date-fns';
import type { EstadoHito, Nivel } from './catalogo';

/**
 * Hitos del trabajo de grado (especialización y maestría) y de investigación (doctorado).
 * Los hitos sugeridos son un punto de partida: cada programa tiene los suyos y se pueden
 * renombrar, fechar o borrar.
 */

export const NOMBRE_ESTADO_HITO: Record<EstadoHito, string> = {
  pendiente: 'Pendiente',
  enCurso: 'En curso',
  entregado: 'Entregado',
  aprobado: 'Aprobado',
};

export function hitosSugeridos(nivel: Nivel): string[] {
  if (nivel === 'doctorado')
    return [
      'Proyecto de tesis',
      'Estado del arte',
      'Examen de candidatura',
      'Primer artículo',
      'Pasantía de investigación',
      'Borrador de tesis',
      'Defensa',
    ];
  return ['Propuesta', 'Marco teórico', 'Metodología', 'Avances', 'Sustentación'];
}

export interface HitoBasico {
  id: string;
  titulo: string;
  fecha?: string;
  estado: EstadoHito;
}

export const hitoCumplido = (h: HitoBasico) => h.estado === 'entregado' || h.estado === 'aprobado';

export interface ResumenHitos<T extends HitoBasico> {
  total: number;
  cumplidos: number;
  /** De 0 a 1. Aprobado cuenta completo; entregado, a la mitad (falta la aprobación). */
  progreso: number;
  proximo?: T & { dias: number };
  atrasados: T[];
}

export function resumenHitos<T extends HitoBasico>(hitos: T[], hoy = new Date()): ResumenHitos<T> {
  const dia = startOfDay(hoy);
  const dias = (h: T) => differenceInCalendarDays(startOfDay(parseISO(h.fecha!)), dia);
  const abiertos = hitos.filter((h) => !hitoCumplido(h) && h.fecha);
  const atrasados = abiertos.filter((h) => dias(h) < 0).sort((a, b) => dias(a) - dias(b));
  const siguiente = abiertos.filter((h) => dias(h) >= 0).sort((a, b) => dias(a) - dias(b))[0];
  const puntos = hitos.reduce(
    (s, h) => s + (h.estado === 'aprobado' ? 1 : h.estado === 'entregado' ? 0.5 : 0),
    0,
  );
  const r: ResumenHitos<T> = {
    total: hitos.length,
    cumplidos: hitos.filter(hitoCumplido).length,
    progreso: hitos.length ? puntos / hitos.length : 0,
    atrasados,
  };
  if (siguiente) r.proximo = { ...siguiente, dias: dias(siguiente) };
  return r;
}

export interface MesCalendario<T> {
  /** aaaa-mm, o null para los que no tienen fecha. */
  mes: string | null;
  items: T[];
}

/** Agrupa entregas por mes, en orden; las que no tienen fecha van al final. */
export function calendarioPorMes<T extends { fecha?: string }>(items: T[]): MesCalendario<T>[] {
  const conFecha = items.filter((i) => i.fecha).sort((a, b) => a.fecha!.localeCompare(b.fecha!));
  const meses: MesCalendario<T>[] = [];
  for (const i of conFecha) {
    const mes = format(parseISO(i.fecha!), 'yyyy-MM');
    const ultimo = meses[meses.length - 1];
    if (ultimo && ultimo.mes === mes) ultimo.items.push(i);
    else meses.push({ mes, items: [i] });
  }
  const sinFecha = items.filter((i) => !i.fecha);
  if (sinFecha.length) meses.push({ mes: null, items: sinFecha });
  return meses;
}
