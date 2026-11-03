import { differenceInCalendarDays, differenceInHours, parseISO } from 'date-fns';
import type { ErrorRegistrado, Repaso, TarjetaRepaso } from '@/db/esquemas';
import type { Calificacion } from './repaso';
import { pesoError } from './raices';

/**
 * Dominio de un tema, de 0 a 1. Combina tres señales:
 * 1. Aciertos en los repasos: promedio ponderado (los recientes pesan más) con un punto de partida neutro.
 * 2. Caída por tiempo: si no repasas, el dominio baja según los intervalos que ya alcanzaron sus tarjetas.
 * 3. Errores recientes: cada error sin resolver lo baja, y pesa menos con el tiempo.
 */

export const PUNTAJE_CALIFICACION: Record<Calificacion, number> = {
  olvide: 0,
  dificil: 0.55,
  bien: 0.85,
  facil: 1,
};

export interface ParametrosDominio {
  /** Dominio supuesto cuando no hay repasos. */
  inicial: number;
  /** Cuántos repasos "vale" el punto de partida. */
  pesoInicial: number;
  /** Días para que un repaso pese la mitad en el promedio. */
  vidaMediaRepasos: number;
  /** Fracción del dominio que nunca se pierde solo por tiempo. */
  pisoRetencion: number;
  /** Cuánto baja el dominio por cada error reciente sin resolver. */
  castigoError: number;
}

export const PARAMETROS_DOMINIO: ParametrosDominio = {
  inicial: 0.3,
  pesoInicial: 1,
  vidaMediaRepasos: 30,
  pisoRetencion: 0.4,
  castigoError: 0.25,
};

export function calcularDominio(
  entrada: {
    repasos: Pick<Repaso, 'fecha' | 'calificacion'>[];
    tarjetas: Pick<TarjetaRepaso, 'intervalo'>[];
    errores: Pick<ErrorRegistrado, 'fecha' | 'resuelto'>[];
  },
  ahora = new Date(),
  p: ParametrosDominio = PARAMETROS_DOMINIO,
): number {
  // 1. Aciertos.
  let suma = p.inicial * p.pesoInicial;
  let pesos = p.pesoInicial;
  let ultimo: Date | null = null;
  for (const r of entrada.repasos) {
    const fecha = parseISO(r.fecha);
    const w = Math.pow(
      0.5,
      Math.max(0, differenceInCalendarDays(ahora, fecha)) / p.vidaMediaRepasos,
    );
    suma += w * PUNTAJE_CALIFICACION[r.calificacion];
    pesos += w;
    if (!ultimo || fecha > ultimo) ultimo = fecha;
  }
  let dominio = suma / pesos;

  // 2. Caída por tiempo sin repasar.
  if (ultimo) {
    const dias = Math.max(0, differenceInHours(ahora, ultimo) / 24);
    const intervalos = entrada.tarjetas.map((t) => t.intervalo).filter((i) => i > 0);
    const estabilidad = Math.max(
      2,
      intervalos.length ? intervalos.reduce((s, i) => s + i, 0) / intervalos.length : 2,
    );
    const retencion = Math.pow(0.5, dias / (estabilidad * 1.5));
    dominio *= p.pisoRetencion + (1 - p.pisoRetencion) * retencion;
  }

  // 3. Errores recientes.
  const castigo = entrada.errores.reduce((s, e) => s + pesoError(e, ahora), 0);
  dominio *= Math.exp(-p.castigoError * castigo);

  return Math.round(Math.min(1, Math.max(0, dominio)) * 1000) / 1000;
}
