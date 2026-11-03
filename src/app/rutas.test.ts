import { describe, expect, it } from 'vitest';
import { buscarRuta, RUTAS } from './rutas';

describe('rutas', () => {
  it('no repite rutas', () => {
    const vistas = new Set(RUTAS.map((r) => r.ruta));
    expect(vistas.size).toBe(RUTAS.length);
  });

  it('incluye todas las vistas pedidas', () => {
    for (const r of [
      '/',
      '/materias',
      '/apuntes',
      '/errores',
      '/repasar',
      '/notas',
      '/ejemplos',
      '/saber11',
      '/trabajo-grado',
      '/lecturas',
    ]) {
      expect(buscarRuta(r), r).toBeDefined();
    }
  });
});
