import { describe, expect, it } from 'vitest';
import { bloquesDeTexto, lineasDePagina, tipoDeArchivo } from './leer';

describe('tipoDeArchivo', () => {
  it('reconoce los formatos', () => {
    expect(tipoDeArchivo('Clase 1.PDF')).toBe('pdf');
    expect(tipoDeArchivo('notas.docx')).toBe('docx');
    expect(tipoDeArchivo('viejo.doc')).toBe('doc');
    expect(tipoDeArchivo('resumen.md')).toBe('texto');
    expect(tipoDeArchivo('foto.png')).toBeNull();
  });
});

describe('bloquesDeTexto', () => {
  it('lee títulos, viñetas y párrafos', () => {
    expect(bloquesDeTexto('# Tema\r\nlínea uno\nlínea dos\n\n- punto\n2) otro\n## Sub')).toEqual([
      { texto: 'Tema', nivel: 1 },
      { texto: 'línea uno línea dos' },
      { texto: 'punto', lista: true },
      { texto: 'otro', lista: true },
      { texto: 'Sub', nivel: 2 },
    ]);
  });
});

describe('lineasDePagina', () => {
  const item = (str: string, y: number, h = 11, x = 0) => ({
    str,
    transform: [h, 0, 0, h, x, y],
    height: h,
  });
  it('junta los fragmentos de una misma línea y marca los saltos de párrafo', () => {
    const bloques = lineasDePagina([
      item('Título', 700, 18),
      item('Primera', 670),
      item('línea', 670),
      item('Segunda línea', 656),
      item('Nuevo párrafo', 620),
    ]);
    expect(bloques).toEqual([
      { texto: 'Título', tamano: 18, paginaNueva: true },
      { texto: 'Primera línea', tamano: 11 },
      { texto: 'Segunda línea', tamano: 11 },
      { texto: 'Nuevo párrafo', tamano: 11, parrafoNuevo: true },
    ]);
  });
});
