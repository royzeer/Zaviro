import { describe, expect, it } from 'vitest';
import type { Seccion } from '@/dominio/documentos';
import { investigarSecciones, investigarTema, seccionConFuentes } from './investigar';

function respuesta(cuerpo: unknown): Response {
  return new Response(JSON.stringify(cuerpo), { status: 200 });
}

const buscarFalso: typeof fetch = async (entrada) => {
  const url = String(entrada);
  if (url.includes('es.wikipedia.org'))
    return respuesta({
      query: {
        pages: {
          '1': {
            title: 'Leyes de Newton',
            index: 1,
            fullurl: 'https://es.wikipedia.org/wiki/Leyes_de_Newton',
            extract:
              'Las leyes de Newton son tres principios que explican el movimiento de los cuerpos. Fueron publicadas en 1687.',
          },
        },
      },
    });
  if (url.includes('es.wikibooks.org'))
    return respuesta({
      query: {
        pages: { '9': { title: 'Física/Dinámica', fullurl: 'https://es.wikibooks.org/wiki/F' } },
      },
    });
  if (url.includes('openalex'))
    return respuesta({
      results: [
        {
          display_name: 'Enseñanza de Newton',
          doi: 'https://doi.org/10.1/x',
          publication_year: 2020,
        },
      ],
    });
  return new Response('', { status: 404 });
};

const seccion: Seccion = {
  titulo: 'Leyes de Newton',
  nivel: 1,
  contenido: 'La fuerza neta es igual a masa por aceleración.',
  palabras: 8,
};

describe('Investigar en internet', () => {
  it('junta el resumen de Wikipedia, libros, artículos y enlaces de búsqueda', async () => {
    const f = await investigarTema('Leyes de Newton', 'Física', buscarFalso);
    expect(f.resumen?.titulo).toBe('Leyes de Newton');
    expect(f.lecturas.map((l) => l.sitio)).toEqual(['Wikilibros', 'Artículo académico']);
    expect(f.busquedas.map((b) => b.sitio)).toEqual(['Google', 'YouTube', 'Khan Academy']);
    expect(f.busquedas[0]!.url).toContain('Leyes%20de%20Newton%20F%C3%ADsica');
  });

  it('agrega "Para saber más" al apunte y una tarjeta con el resumen', async () => {
    const f = await investigarTema('Leyes de Newton', 'Física', buscarFalso);
    const s = seccionConFuentes(seccion, f);
    expect(s.contenido).toContain('## Para saber más');
    expect(s.contenido).toContain(
      '[Wikipedia: Leyes de Newton](https://es.wikipedia.org/wiki/Leyes_de_Newton)',
    );
    expect(s.tarjetas?.[0]?.reverso).toMatch(/^Las leyes de Newton son tres principios/);
  });

  it('sin internet deja los enlaces de búsqueda y no falla', async () => {
    const sinRed: typeof fetch = async () => {
      throw new TypeError('sin conexión');
    };
    const r = await investigarSecciones([seccion], 'Física', undefined, sinRed);
    expect(r.conResumen).toBe(0);
    expect(r.secciones[0]!.contenido).toContain('Buscar en Google');
  });
});
