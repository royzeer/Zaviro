import { describe, expect, it } from 'vitest';
import { leerDesde, MAX_CAMBIOS_POR_ENVIO, validarCambios } from '../src/utils/cambios';
import { AppError } from '../src/utils/respuesta';

function errorDe(f: () => unknown): AppError {
  try {
    f();
  } catch (e) {
    return e as AppError;
  }
  throw new Error('No lanzó error');
}

describe('validarCambios', () => {
  it('acepta registros guardados y borrados', () => {
    const cambios = validarCambios({
      cambios: [
        { tabla: 'materias', id: 'a', datos: { id: 'a', nombre: 'Cálculo' } },
        { tabla: 'apuntes', id: 'b', datos: null },
      ],
    });
    expect(cambios).toEqual([
      { tabla: 'materias', id: 'a', datos: { id: 'a', nombre: 'Cálculo' } },
      { tabla: 'apuntes', id: 'b', datos: null },
    ]);
  });

  it('si un registro llega dos veces se queda con el último', () => {
    const cambios = validarCambios({
      cambios: [
        { tabla: 'temas', id: 'x', datos: { v: 1 } },
        { tabla: 'temas', id: 'x', datos: { v: 2 } },
      ],
    });
    expect(cambios).toEqual([{ tabla: 'temas', id: 'x', datos: { v: 2 } }]);
  });

  it('rechaza cuerpos y cambios mal formados', () => {
    expect(errorDe(() => validarCambios({})).estado).toBe(422);
    expect(errorDe(() => validarCambios(null)).estado).toBe(422);
    expect(errorDe(() => validarCambios({ cambios: [1] })).message).toMatch(/Cambio 1/);
    expect(
      errorDe(() => validarCambios({ cambios: [{ tabla: 'drop table', id: 'a', datos: null }] }))
        .message,
    ).toMatch(/tabla/);
    expect(
      errorDe(() => validarCambios({ cambios: [{ tabla: 'temas', id: '', datos: null }] })).message,
    ).toMatch(/id/);
    expect(
      errorDe(() => validarCambios({ cambios: [{ tabla: 'temas', id: 'a', datos: [1] }] })).message,
    ).toMatch(/objeto/);
  });

  it('limita la cantidad y el tamaño', () => {
    const muchos = Array.from({ length: MAX_CAMBIOS_POR_ENVIO + 1 }, (_, i) => ({
      tabla: 'temas',
      id: String(i),
      datos: null,
    }));
    expect(errorDe(() => validarCambios({ cambios: muchos })).estado).toBe(413);
    const grande = { tabla: 'apuntes', id: 'a', datos: { texto: 'x'.repeat(600 * 1024) } };
    expect(errorDe(() => validarCambios({ cambios: [grande] })).estado).toBe(413);
  });
});

describe('leerDesde', () => {
  it('lee números enteros no negativos', () => {
    expect(leerDesde(undefined)).toBe(0);
    expect(leerDesde('15')).toBe(15);
    expect(errorDe(() => leerDesde('-1')).estado).toBe(422);
    expect(errorDe(() => leerDesde('abc')).estado).toBe(422);
  });
});
