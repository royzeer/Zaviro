import { describe, expect, it } from 'vitest';
import { componentes, enEquilibrio, largoFlecha, resultante } from './fuerzas';

describe('fuerzas', () => {
  it('descompone una fuerza en x y y', () => {
    expect(componentes({ magnitud: 10, angulo: 0 })).toEqual({ x: 10, y: 0 });
    expect(componentes({ magnitud: 10, angulo: 90 })).toEqual({ x: 0, y: 10 });
    const c = componentes({ magnitud: 10, angulo: 30 });
    expect(c.x).toBeCloseTo(8.66, 2);
    expect(c.y).toBeCloseTo(5, 5);
  });

  it('suma fuerzas y da magnitud y ángulo de la resultante', () => {
    const r = resultante([
      { magnitud: 3, angulo: 0 },
      { magnitud: 4, angulo: 90 },
    ]);
    expect(r.magnitud).toBeCloseTo(5);
    expect(r.angulo).toBeCloseTo(53.13, 2);
    expect(resultante([{ magnitud: 2, angulo: 270 }]).angulo).toBeCloseTo(270);
  });

  it('reconoce el equilibrio', () => {
    expect(
      enEquilibrio([
        { magnitud: 70.7106781, angulo: 135 },
        { magnitud: 70.7106781, angulo: 45 },
        { magnitud: 100, angulo: 270 },
      ]),
    ).toBe(true);
    expect(enEquilibrio([{ magnitud: 1, angulo: 0 }])).toBe(false);
  });

  it('escala las flechas entre un mínimo y un máximo', () => {
    expect(largoFlecha(100, 100)).toBe(120);
    expect(largoFlecha(0, 100)).toBe(36);
    expect(largoFlecha(50, 100)).toBe(78);
    expect(largoFlecha(5, 0)).toBe(36);
  });
});
