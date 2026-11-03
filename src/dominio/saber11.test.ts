import { describe, expect, it } from 'vitest';
import { aporteAlGlobal, evolucion, pruebasPorReforzar, puntajeGlobal } from './saber11';

const p = (lc: number, m: number, sc: number, cn: number, i: number) => ({
  lecturaCritica: lc,
  matematicas: m,
  socialesCiudadanas: sc,
  cienciasNaturales: cn,
  ingles: i,
});

describe('Saber 11', () => {
  it('calcula el global como promedio ponderado por 5', () => {
    expect(puntajeGlobal(p(100, 100, 100, 100, 100))).toBe(500);
    expect(puntajeGlobal(p(0, 0, 0, 0, 0))).toBe(0);
    // (60·3 + 55·3 + 58·3 + 52·3 + 70·1) / 13 · 5 = 745 / 13 · 5 = 286,5 → 287
    expect(puntajeGlobal(p(60, 55, 58, 52, 70))).toBe(Math.round(((225 * 3 + 70) / 13) * 5));
    expect(puntajeGlobal(p(60, 55, 58, 52, 70))).toBe(287);
  });

  it('inglés pesa un tercio de lo que pesa cada una de las otras pruebas', () => {
    expect(aporteAlGlobal('matematicas', 10)).toBeCloseTo((10 * 3 * 5) / 13);
    expect(aporteAlGlobal('ingles', 10)).toBeCloseTo((10 * 1 * 5) / 13);
    expect(aporteAlGlobal('matematicas', 10) / aporteAlGlobal('ingles', 10)).toBeCloseTo(3);
  });

  it('acota los puntajes al rango 0 a 100 y acepta pesos editados', () => {
    expect(puntajeGlobal(p(120, 100, 100, 100, -5))).toBe(puntajeGlobal(p(100, 100, 100, 100, 0)));
    const iguales = {
      lecturaCritica: 1,
      matematicas: 1,
      socialesCiudadanas: 1,
      cienciasNaturales: 1,
      ingles: 1,
    };
    expect(puntajeGlobal(p(50, 50, 50, 50, 100), iguales)).toBe(300);
  });

  it('ordena la evolución por fecha y calcula el cambio', () => {
    const ev = evolucion([
      { id: 'b', fecha: '2026-08-01', puntajes: p(60, 60, 60, 60, 60) },
      { id: 'a', fecha: '2026-05-01', puntajes: p(50, 50, 50, 50, 50) },
    ]);
    expect(ev.map((e) => e.id)).toEqual(['a', 'b']);
    expect(ev[0]!.cambio).toBeNull();
    expect(ev[1]!.cambio).toBe(50);
  });

  it('sugiere reforzar la prueba con más puntaje global por ganar', () => {
    const r = pruebasPorReforzar([
      { id: 'a', fecha: '2026-05-01', puntajes: p(70, 40, 65, 60, 30) },
    ]);
    expect(r[0]!.prueba).toBe('matematicas');
    // Inglés tiene el puntaje más bajo pero pesa 1/13: no es la primera.
    expect(r[0]!.margen).toBeGreaterThan(r.find((x) => x.prueba === 'ingles')!.margen);
  });

  it('usa el promedio de los últimos simulacros y tiene en cuenta si una prueba viene bajando', () => {
    const r = pruebasPorReforzar([
      { id: '1', fecha: '2026-01-01', puntajes: p(10, 10, 10, 10, 10) },
      { id: '2', fecha: '2026-03-01', puntajes: p(70, 60, 60, 60, 50) },
      { id: '3', fecha: '2026-04-01', puntajes: p(60, 60, 60, 60, 50) },
      { id: '4', fecha: '2026-05-01', puntajes: p(50, 60, 60, 60, 50) },
    ]);
    const lc = r.find((x) => x.prueba === 'lecturaCritica')!;
    expect(lc.promedio).toBe(60);
    expect(lc.tendencia).toBe(-20);
    expect(r[0]!.prueba).toBe('lecturaCritica');
  });

  it('sin simulacros no sugiere nada', () => {
    expect(pruebasPorReforzar([])).toEqual([]);
  });
});
