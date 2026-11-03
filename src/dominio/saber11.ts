import { SABER11 } from '@/config/saber11';
import { PRUEBAS_SABER11, type PruebaSaber11 } from './catalogo';

/**
 * Lógica de la preparación Saber 11: puntaje global, evolución entre simulacros y qué prueba
 * conviene reforzar primero. Los pesos vienen de src/config/saber11.ts.
 */

export type PuntajesSaber11 = Record<PruebaSaber11, number>;
export type PesosSaber11 = Record<PruebaSaber11, number>;

export interface SimulacroBasico {
  id: string;
  fecha: string;
  puntajes: PuntajesSaber11;
}

const limitar = (n: number) => Math.min(SABER11.maximoPrueba, Math.max(0, n));

/**
 * Puntaje global de 0 a 500: promedio ponderado de las cinco pruebas por el factor (5),
 * redondeado al entero más cercano.
 */
export function puntajeGlobal(puntajes: PuntajesSaber11, pesos: PesosSaber11 = SABER11.pesos) {
  const total = PRUEBAS_SABER11.reduce((s, p) => s + pesos[p], 0);
  if (total <= 0) return 0;
  const ponderado = PRUEBAS_SABER11.reduce((s, p) => s + limitar(puntajes[p]) * pesos[p], 0);
  return Math.round((ponderado / total) * SABER11.factorGlobal);
}

/** Puntos de global que suma subir `puntos` en una prueba (sin redondear). */
export function aporteAlGlobal(
  prueba: PruebaSaber11,
  puntos: number,
  pesos: PesosSaber11 = SABER11.pesos,
): number {
  const total = PRUEBAS_SABER11.reduce((s, p) => s + pesos[p], 0);
  return total > 0 ? (puntos * pesos[prueba] * SABER11.factorGlobal) / total : 0;
}

const porFecha = <T extends { fecha: string }>(lista: T[]) =>
  [...lista].sort((a, b) => a.fecha.localeCompare(b.fecha));

export interface PuntoEvolucion {
  id: string;
  fecha: string;
  global: number;
  /** Cambio frente al simulacro anterior (null en el primero). */
  cambio: number | null;
}

export function evolucion(
  simulacros: SimulacroBasico[],
  pesos: PesosSaber11 = SABER11.pesos,
): PuntoEvolucion[] {
  let anterior: number | null = null;
  return porFecha(simulacros).map((s) => {
    const global = puntajeGlobal(s.puntajes, pesos);
    const punto = {
      id: s.id,
      fecha: s.fecha,
      global,
      cambio: anterior === null ? null : global - anterior,
    };
    anterior = global;
    return punto;
  });
}

export interface PrioridadPrueba {
  prueba: PruebaSaber11;
  /** Promedio de los últimos simulacros (hasta `ventana`). */
  promedio: number;
  /** Cambio entre el primero y el último de esa ventana. */
  tendencia: number;
  /** Puntos de global que quedan por ganar en esa prueba: (100 − promedio) × peso relativo × 5. */
  margen: number;
  /** Puntos de global que suman 10 puntos más en esa prueba. */
  porDiez: number;
}

/**
 * Ordena las pruebas por cuánto puntaje global queda por ganar en cada una, usando el promedio
 * de los últimos simulacros para no reaccionar a un solo resultado. Si una prueba viene bajando,
 * sube un poco en la lista (se suma la caída al margen). En empate, primero la de menor promedio.
 */
export function pruebasPorReforzar(
  simulacros: SimulacroBasico[],
  ventana = 3,
  pesos: PesosSaber11 = SABER11.pesos,
): PrioridadPrueba[] {
  const recientes = porFecha(simulacros).slice(-ventana);
  if (recientes.length === 0) return [];
  const lista = PRUEBAS_SABER11.map((prueba) => {
    const valores = recientes.map((s) => limitar(s.puntajes[prueba]));
    const promedio = valores.reduce((s, v) => s + v, 0) / valores.length;
    const tendencia = valores[valores.length - 1]! - valores[0]!;
    const caida = Math.max(0, -tendencia);
    return {
      prueba,
      promedio,
      tendencia,
      margen: aporteAlGlobal(prueba, SABER11.maximoPrueba - promedio + caida, pesos),
      porDiez: aporteAlGlobal(prueba, 10, pesos),
    };
  });
  return lista.sort((a, b) => b.margen - a.margen || a.promedio - b.promedio);
}
