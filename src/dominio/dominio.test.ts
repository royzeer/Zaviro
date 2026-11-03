import { describe, expect, it } from 'vitest';
import { calcularDominio, PARAMETROS_DOMINIO } from './dominio';
import type { Calificacion } from './repaso';

const ahora = new Date('2026-11-03T12:00:00');
const hace = (d: number) => new Date(ahora.getTime() - d * 86_400_000).toISOString();
const repasos = (lista: [number, Calificacion][]) =>
  lista.map(([d, calificacion]) => ({ fecha: hace(d), calificacion }));

describe('dominio por tema', () => {
  it('sin datos queda en el punto de partida', () => {
    expect(calcularDominio({ repasos: [], tarjetas: [], errores: [] }, ahora)).toBe(
      PARAMETROS_DOMINIO.inicial,
    );
  });

  it('sube con aciertos y baja con olvidos', () => {
    const bien = calcularDominio(
      {
        repasos: repasos([
          [0, 'bien'],
          [0, 'facil'],
          [0, 'bien'],
        ]),
        tarjetas: [{ intervalo: 4 }],
        errores: [],
      },
      ahora,
    );
    const mal = calcularDominio(
      {
        repasos: repasos([
          [0, 'olvide'],
          [0, 'dificil'],
          [0, 'olvide'],
        ]),
        tarjetas: [{ intervalo: 4 }],
        errores: [],
      },
      ahora,
    );
    expect(bien).toBeGreaterThan(0.7);
    expect(mal).toBeLessThan(0.3);
  });

  it('cae con el tiempo sin repasar, pero no por debajo del piso', () => {
    const entrada = (d: number) => ({
      repasos: repasos([
        [d, 'facil'],
        [d, 'facil'],
        [d, 'facil'],
      ]),
      tarjetas: [{ intervalo: 3 }],
      errores: [],
    });
    const hoy = calcularDominio(entrada(0), ahora);
    const mes = calcularDominio(entrada(30), ahora);
    const anio = calcularDominio(entrada(365), ahora);
    expect(mes).toBeLessThan(hoy);
    expect(anio).toBeLessThan(mes);
    expect(anio).toBeGreaterThan(0);
  });

  it('las tarjetas con intervalos largos olvidan más despacio', () => {
    const conIntervalo = (i: number) =>
      calcularDominio(
        { repasos: repasos([[10, 'bien']]), tarjetas: [{ intervalo: i }], errores: [] },
        ahora,
      );
    expect(conIntervalo(30)).toBeGreaterThan(conIntervalo(2));
  });

  it('los errores recientes sin resolver lo bajan', () => {
    const base = {
      repasos: repasos([
        [1, 'bien'],
        [2, 'bien'],
      ]),
      tarjetas: [{ intervalo: 4 }],
    };
    const sin = calcularDominio({ ...base, errores: [] }, ahora);
    const reciente = calcularDominio(
      { ...base, errores: [{ fecha: hace(0), resuelto: false }] },
      ahora,
    );
    const viejo = calcularDominio(
      { ...base, errores: [{ fecha: hace(90), resuelto: false }] },
      ahora,
    );
    const resuelto = calcularDominio(
      { ...base, errores: [{ fecha: hace(0), resuelto: true }] },
      ahora,
    );
    expect(reciente).toBeLessThan(sin);
    expect(viejo).toBeGreaterThan(reciente);
    expect(resuelto).toBeGreaterThan(reciente);
  });

  it('siempre queda entre 0 y 1', () => {
    const d = calcularDominio(
      {
        repasos: repasos([[0, 'olvide']]),
        tarjetas: [],
        errores: Array.from({ length: 30 }, () => ({ fecha: hace(0), resuelto: false })),
      },
      ahora,
    );
    expect(d).toBeGreaterThanOrEqual(0);
    expect(d).toBeLessThanOrEqual(1);
  });
});
