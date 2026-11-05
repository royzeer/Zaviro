// Busca en internet información de cada tema, gratis y sin claves: un resumen de Wikipedia,
// libros de Wikilibros y artículos académicos de OpenAlex, más enlaces de búsqueda en Google,
// YouTube y Khan Academy. Si no hay internet o una fuente falla, se sigue sin ella.
import { contarPalabras, type Seccion } from '@/dominio/documentos';

export interface Enlace {
  titulo: string;
  url: string;
  sitio: string;
}

export interface Fuentes {
  resumen?: { texto: string; titulo: string; url: string };
  lecturas: Enlace[];
  busquedas: Enlace[];
}

type Buscador = typeof fetch;
const ESPERA_MS = 8000;

async function json<T>(url: string, buscar: Buscador): Promise<T | null> {
  const control = new AbortController();
  const reloj = setTimeout(() => control.abort(), ESPERA_MS);
  try {
    const r = await buscar(url, { signal: control.signal });
    return r.ok ? ((await r.json()) as T) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(reloj);
  }
}

const q = encodeURIComponent;

interface RespuestaWiki {
  query?: {
    pages?: Record<string, { title: string; extract?: string; fullurl?: string; index?: number }>;
  };
}

/** Primer resultado de búsqueda de un sitio MediaWiki (Wikipedia, Wikilibros), con su introducción. */
async function buscarEnWiki(sitio: string, consulta: string, cuantos: number, buscar: Buscador) {
  const url =
    `https://${sitio}/w/api.php?action=query&format=json&origin=*&generator=search` +
    `&gsrsearch=${q(consulta)}&gsrlimit=${cuantos}&prop=extracts|info&exintro=1&explaintext=1` +
    `&exsentences=4&inprop=url&redirects=1`;
  const r = await json<RespuestaWiki>(url, buscar);
  return Object.values(r?.query?.pages ?? {}).sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
}

interface RespuestaOpenAlex {
  results?: {
    display_name?: string;
    doi?: string | null;
    id?: string;
    publication_year?: number;
  }[];
}

async function articulos(consulta: string, buscar: Buscador): Promise<Enlace[]> {
  const r = await json<RespuestaOpenAlex>(
    `https://api.openalex.org/works?search=${q(consulta)}&per-page=2&filter=is_oa:true`,
    buscar,
  );
  return (r?.results ?? [])
    .filter((a) => a.display_name && (a.doi || a.id))
    .map((a) => ({
      titulo: `${a.display_name!}${a.publication_year ? ` (${a.publication_year})` : ''}`,
      url: a.doi || a.id!,
      sitio: 'Artículo académico',
    }));
}

/** Enlaces para seguir buscando el tema en las páginas más usadas. */
export function enlacesDeBusqueda(tema: string, materia: string): Enlace[] {
  const consulta = `${tema} ${materia}`.trim();
  return [
    {
      titulo: 'Buscar en Google',
      url: `https://www.google.com/search?q=${q(consulta)}`,
      sitio: 'Google',
    },
    {
      titulo: 'Videos en YouTube',
      url: `https://www.youtube.com/results?search_query=${q(`${consulta} explicación`)}`,
      sitio: 'YouTube',
    },
    {
      titulo: 'Clases en Khan Academy',
      url: `https://es.khanacademy.org/search?page_search_query=${q(tema)}`,
      sitio: 'Khan Academy',
    },
  ];
}

/** Información del tema en varias fuentes. Primero busca con la materia para no confundir el tema. */
export async function investigarTema(
  tema: string,
  materia: string,
  buscar: Buscador = fetch,
): Promise<Fuentes> {
  const conMateria = `${tema} ${materia}`.trim();
  const [wiki, libros, academicos] = await Promise.all([
    buscarEnWiki('es.wikipedia.org', conMateria, 1, buscar).then(async (r) =>
      r[0]?.extract ? r : buscarEnWiki('es.wikipedia.org', tema, 1, buscar),
    ),
    buscarEnWiki('es.wikibooks.org', tema, 2, buscar),
    articulos(conMateria, buscar),
  ]);
  const pagina = wiki.find((p) => p.extract && contarPalabras(p.extract) >= 8);
  return {
    ...(pagina
      ? {
          resumen: {
            texto: pagina.extract!.replace(/\s+/g, ' ').trim(),
            titulo: pagina.title,
            url: pagina.fullurl ?? `https://es.wikipedia.org/wiki/${q(pagina.title)}`,
          },
        }
      : {}),
    lecturas: [
      ...libros
        .filter((l) => l.fullurl)
        .map((l) => ({ titulo: l.title, url: l.fullurl!, sitio: 'Wikilibros' })),
      ...academicos,
    ],
    busquedas: enlacesDeBusqueda(tema, materia),
  };
}

/** Agrega al apunte la sección "Para saber más" y una tarjeta con el resumen de internet. */
export function seccionConFuentes(s: Seccion, f: Fuentes): Seccion {
  const partes: string[] = ['## Para saber más'];
  if (f.resumen)
    partes.push(`${f.resumen.texto}\n\nFuente: [Wikipedia: ${f.resumen.titulo}](${f.resumen.url})`);
  const enlaces = [
    ...f.lecturas.map((l) => `- ${l.sitio}: [${l.titulo.replace(/[[\]]/g, '')}](${l.url})`),
    ...f.busquedas.map((b) => `- [${b.titulo}](${b.url})`),
  ];
  if (enlaces.length) partes.push(enlaces.join('\n'));
  const contenido = `${s.contenido}\n\n${partes.join('\n\n')}`;
  const primera = f.resumen?.texto.split(/(?<=[.!?])\s+/)[0];
  const tarjetas =
    primera && contarPalabras(primera) >= 6
      ? [
          ...(s.tarjetas ?? []),
          { frente: `En pocas palabras, ¿qué es ${s.titulo}?`, reverso: primera },
        ]
      : s.tarjetas;
  return { ...s, contenido, ...(tarjetas ? { tarjetas } : {}) };
}

/** Investiga todos los temas, de a tres a la vez para no saturar las páginas. */
export async function investigarSecciones(
  secciones: Seccion[],
  materia: string,
  alAvanzar?: (hechas: number) => void,
  buscar: Buscador = fetch,
): Promise<{ secciones: Seccion[]; conResumen: number }> {
  const salida = [...secciones];
  let hechas = 0;
  let conResumen = 0;
  for (let i = 0; i < secciones.length; i += 3) {
    await Promise.all(
      secciones.slice(i, i + 3).map(async (s, j) => {
        const f = await investigarTema(s.titulo, materia, buscar);
        if (f.resumen) conResumen++;
        salida[i + j] = seccionConFuentes(s, f);
        alAvanzar?.(++hechas);
      }),
    );
  }
  return { secciones: salida, conResumen };
}
