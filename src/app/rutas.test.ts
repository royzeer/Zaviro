import { describe, expect, it } from 'vitest';
import { buscarRuta, resolverRuta, RUTAS, rutasVisibles } from './rutas';

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

  it('resuelve rutas con parámetro', () => {
    expect(resolverRuta('/materias/abc')).toMatchObject({
      def: { ruta: '/materias' },
      parametro: 'abc',
    });
    expect(resolverRuta('/materias')?.parametro).toBeUndefined();
    expect(resolverRuta('/no-existe/abc')).toBeUndefined();
  });

  it('oculta los módulos que el perfil no tiene activos', () => {
    const rutas = rutasVisibles(['materias', 'apuntes', 'saber11']).map((r) => r.ruta);
    expect(rutas).toContain('/saber11');
    expect(rutas).not.toContain('/trabajo-grado');
    expect(rutas).toContain('/ajustes');
    expect(rutasVisibles(['plan']).map((r) => r.ruta)).toContain('/notas');
  });
});
