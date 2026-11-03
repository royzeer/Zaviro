import { addMinutes } from 'date-fns';
import type { Reglas, TarjetaRepaso } from '@/db/esquemas';

/**
 * Repetición espaciada con el algoritmo SM-2 (SuperMemo 2).
 * Las cuatro calificaciones de la interfaz se traducen a la escala 0 a 5 de SM-2.
 * Los primeros intervalos salen de las reglas del perfil (editables por nivel);
 * desde ahí, cada intervalo se multiplica por la facilidad de la tarjeta.
 */

export const CALIFICACIONES = ['olvide', 'dificil', 'bien', 'facil'] as const;
export type Calificacion = (typeof CALIFICACIONES)[number];

export const NOMBRE_CALIFICACION: Record<Calificacion, string> = {
  olvide: 'Olvidé',
  dificil: 'Difícil',
  bien: 'Bien',
  facil: 'Fácil',
};

/** Calidad de la respuesta en la escala de SM-2. */
export const CALIDAD: Record<Calificacion, number> = { olvide: 1, dificil: 3, bien: 4, facil: 5 };

export const FACILIDAD_INICIAL = 2.5;
export const FACILIDAD_MINIMA = 1.3;
/** Si se olvida, se vuelve a mostrar en este tiempo (minutos) dentro de la misma sesión. */
export const MINUTOS_REINTENTO = 10;

export type EstadoSm2 = Pick<TarjetaRepaso, 'facilidad' | 'intervalo' | 'repeticiones'>;

export function nuevaFacilidad(facilidad: number, calidad: number): number {
  const f = facilidad + (0.1 - (5 - calidad) * (0.08 + (5 - calidad) * 0.02));
  return Math.max(FACILIDAD_MINIMA, Math.round(f * 1000) / 1000);
}

/**
 * Aplica SM-2. Devuelve el nuevo estado y el intervalo en días hasta el próximo repaso.
 * `intervalosIniciales` viene de las reglas del perfil (por ejemplo [1, 4] en pregrado).
 */
export function sm2(
  estado: EstadoSm2,
  calificacion: Calificacion,
  intervalosIniciales: number[],
): EstadoSm2 {
  const q = CALIDAD[calificacion];
  const facilidad = nuevaFacilidad(estado.facilidad, q);
  if (q < 3) {
    // Se olvidó: vuelve a empezar, pero conserva la facilidad ajustada.
    return { facilidad, repeticiones: 0, intervalo: 0 };
  }
  const n = estado.repeticiones;
  let intervalo: number;
  if (n < intervalosIniciales.length) {
    intervalo = intervalosIniciales[n]!;
    // "Fácil" en las primeras repeticiones salta un poco más; "difícil" se queda más corto.
    if (calificacion === 'facil') intervalo = intervalo * 1.3;
    if (calificacion === 'dificil') intervalo = Math.max(intervalosIniciales[0]!, intervalo * 0.8);
  } else {
    intervalo = Math.max(1, estado.intervalo) * facilidad;
    if (calificacion === 'dificil')
      intervalo = Math.max(estado.intervalo + 1, Math.max(1, estado.intervalo) * 1.2);
  }
  return { facilidad, repeticiones: n + 1, intervalo: Math.round(intervalo * 10) / 10 };
}

/** Fecha del próximo repaso: días después de ahora, o unos minutos si se olvidó. */
export function proximaFecha(intervaloDias: number, ahora: Date): Date {
  if (intervaloDias <= 0) return addMinutes(ahora, MINUTOS_REINTENTO);
  return addMinutes(ahora, Math.round(intervaloDias * 24 * 60));
}

/** Aplica una calificación a una tarjeta usando las reglas del perfil. */
export function calificarTarjeta(
  tarjeta: TarjetaRepaso,
  calificacion: Calificacion,
  reglas: Pick<Reglas, 'repaso'>,
  ahora = new Date(),
): TarjetaRepaso {
  const estado = sm2(tarjeta, calificacion, reglas.repaso.intervalosIniciales);
  return {
    ...tarjeta,
    ...estado,
    proximoRepaso: proximaFecha(estado.intervalo, ahora).toISOString(),
  };
}

/** Texto corto del próximo intervalo para mostrar en cada botón ("10 min", "4 d", "2 meses"). */
export function textoIntervalo(dias: number): string {
  if (dias <= 0) return `${MINUTOS_REINTENTO} min`;
  if (dias < 1) return `${Math.round(dias * 24)} h`;
  if (dias < 31) return `${Math.round(dias)} d`;
  if (dias < 365)
    return `${Math.round(dias / 30)} ${Math.round(dias / 30) === 1 ? 'mes' : 'meses'}`;
  return `${Math.round((dias / 365) * 10) / 10} años`.replace('.', ',');
}

export function tarjetasVencidas<T extends Pick<TarjetaRepaso, 'proximoRepaso'>>(
  tarjetas: T[],
  ahora = new Date(),
): T[] {
  const limite = ahora.toISOString();
  return tarjetas
    .filter((t) => t.proximoRepaso <= limite)
    .sort((a, b) => a.proximoRepaso.localeCompare(b.proximoRepaso));
}
