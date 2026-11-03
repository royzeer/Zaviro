import { describe, expect, it } from 'vitest';
import { duracion, leerNumero } from './numeros';

describe('números', () => {
  it('lee coma o punto decimal', () => {
    expect(leerNumero('3,5')).toBe(3.5);
    expect(leerNumero('4.2')).toBe(4.2);
    expect(leerNumero('abc')).toBeNull();
    expect(leerNumero('')).toBeNull();
  });

  it('escribe duraciones legibles redondeadas a 5 minutos', () => {
    expect(duracion(1.92)).toBe('1 h 55 min');
    expect(duracion(2)).toBe('2 h');
    expect(duracion(0.75)).toBe('45 min');
    expect(duracion(0.01)).toBe('0 min');
  });
});
