import { describe, expect, it } from 'vitest';
import { textoSincronizacion, textoSincronizacionCorto } from './texto';

const ahora = new Date('2026-11-03T12:00:00Z');

describe('textoSincronizacion', () => {
  it('describe cada estado', () => {
    expect(
      textoSincronizacion({ estado: 'sincronizando', ultima: null, pendientes: 2 }, ahora),
    ).toBe('Sincronizando…');
    expect(textoSincronizacion({ estado: 'inactivo', ultima: null, pendientes: 0 }, ahora)).toBe(
      'Aún no se ha sincronizado.',
    );
    expect(
      textoSincronizacion(
        { estado: 'inactivo', ultima: '2026-11-03T11:59:40Z', pendientes: 0 },
        ahora,
      ),
    ).toBe('Todo guardado en tu cuenta hace un momento.');
    expect(textoSincronizacion({ estado: 'sinConexion', ultima: null, pendientes: 1 }, ahora)).toBe(
      'Sin conexión con el servidor. Queda 1 cambio por subir.',
    );
    expect(textoSincronizacion({ estado: 'error', ultima: null, pendientes: 3 }, ahora)).toBe(
      'No se pudo sincronizar. Quedan 3 cambios por subir.',
    );
  });
});

describe('textoSincronizacionCorto', () => {
  it('cabe en la barra lateral', () => {
    expect(textoSincronizacionCorto({ estado: 'inactivo', pendientes: 0 })).toBe(
      'Guardado en tu cuenta',
    );
    expect(textoSincronizacionCorto({ estado: 'sinConexion', pendientes: 4 })).toBe(
      'Sin conexión, 4 por subir',
    );
  });
});
