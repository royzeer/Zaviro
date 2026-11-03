import { describe, expect, it } from 'vitest';
import {
  bancoDeCitas,
  colaDeLectura,
  contarPorEstado,
  formatoCita,
  normalizar,
  type LecturaBasica,
} from './lecturas';

const lecturas: LecturaBasica[] = [
  {
    id: 'a',
    referencia: 'Hernández Sampieri, R. (2014). Metodología de la investigación.',
    estado: 'leida',
    citas: [
      {
        texto: 'La investigación es un conjunto de procesos sistemáticos.',
        fuente: '',
        pagina: '4',
      },
    ],
  },
  { id: 'b', referencia: 'Creswell (2014). Research design.', estado: 'porLeer', citas: [] },
  {
    id: 'c',
    referencia: 'Eco, U. (1977). Cómo se hace una tesis.',
    estado: 'leyendo',
    citas: [{ texto: 'Hacer una tesis significa aprender a poner orden.', fuente: 'Eco (1977)' }],
  },
];

describe('lecturas', () => {
  it('cuenta por estado', () => {
    expect(contarPorEstado(lecturas)).toEqual({ porLeer: 1, leyendo: 1, leida: 1 });
  });

  it('arma la cola con lo que estás leyendo primero', () => {
    expect(colaDeLectura(lecturas).map((l) => l.id)).toEqual(['c', 'b']);
  });

  it('el banco de citas usa la referencia si la cita no tiene fuente', () => {
    const banco = bancoDeCitas(lecturas);
    expect(banco).toHaveLength(2);
    expect(banco[0]!.fuente).toMatch(/^Hernández Sampieri/);
    expect(banco[1]!.fuente).toBe('Eco (1977)');
  });

  it('busca sin importar tildes ni mayúsculas, también en la referencia', () => {
    expect(bancoDeCitas(lecturas, 'SISTEMATICOS')).toHaveLength(1);
    expect(bancoDeCitas(lecturas, 'como se hace')).toHaveLength(1);
    expect(bancoDeCitas(lecturas, 'nada que ver')).toHaveLength(0);
    expect(normalizar(' Cómo ')).toBe('como');
  });

  it('da formato a la cita para copiarla', () => {
    expect(formatoCita({ texto: 'Orden.', fuente: 'Eco (1977)', pagina: '12' })).toBe(
      '"Orden." (Eco (1977), p. 12)',
    );
    expect(formatoCita({ texto: 'Orden.', fuente: 'Eco (1977)' })).toBe('"Orden." (Eco (1977))');
  });
});
