import { describe, expect, it } from 'vitest';
import { esNivelAnterior, NIVELES, ORDEN_NIVEL } from './catalogo';

describe('catálogo de niveles', () => {
  it('tiene siete niveles en orden creciente', () => {
    expect(NIVELES).toHaveLength(7);
    const ordenes = NIVELES.map((n) => ORDEN_NIVEL[n]);
    expect([...ordenes].sort((a, b) => a - b)).toEqual(ordenes);
  });

  it('detecta cuando una raíz viene de un nivel anterior', () => {
    expect(esNivelAnterior('bachillerato', 'maestria')).toBe(true);
    expect(esNivelAnterior('profesional', 'maestria')).toBe(true);
    expect(esNivelAnterior('maestria', 'maestria')).toBe(false);
    expect(esNivelAnterior('doctorado', 'tecnologo')).toBe(false);
  });
});
