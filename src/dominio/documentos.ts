/**
 * Lectura de documentos (PDF, Word o texto) para convertirlos en temas y apuntes.
 * Todo es lógica propia: se reconocen los títulos por su tamaño de letra, su numeración
 * o su estilo; se arman párrafos; se reparten los pesos según la extensión de cada sección;
 * se buscan fechas de examen y definiciones para crear tarjetas de repaso.
 */

/** Una línea o párrafo tal como sale del documento. */
export interface Bloque {
  texto: string;
  /** Tamaño de letra (PDF). */
  tamano?: number;
  /** Nivel de título explícito (Word o Markdown): 1, 2, 3… */
  nivel?: number;
  /** Elemento de lista. */
  lista?: boolean;
  /** Primer bloque de una página nueva (PDF). */
  paginaNueva?: boolean;
  /** Hay un espacio grande antes de esta línea: empieza un párrafo (PDF). */
  parrafoNuevo?: boolean;
}

export interface Seccion {
  titulo: string;
  nivel: number;
  /** Contenido en Markdown. */
  contenido: string;
  palabras: number;
  /** Importancia de 1 a 10 (ver `analizarSecciones`); sin ella el peso sale de la extensión. */
  importancia?: number;
  dificultad?: 'baja' | 'media' | 'alta';
  /** Tarjetas ya armadas; sin ellas se buscan definiciones en el texto. */
  tarjetas?: { frente: string; reverso: string }[];
}

export interface DocumentoLeido {
  titulo: string;
  secciones: Seccion[];
  palabras: number;
}

const NUMERADO =
  /^(?:(?:\d{1,2}(?:\.\d{1,2}){0,3}\.?)|(?:[IVXLC]{1,6}\.)|(?:cap[ií]tulo|unidad|tema|m[oó]dulo|secci[oó]n|parte|lecci[oó]n)\s+[\dIVXLC]+[.:]?)\s+\S/i;
const SOLO_NUMERO = /^[\d\s.,-]+$/;

export function contarPalabras(texto: string): number {
  const m = texto.match(/[\p{L}\p{N}]+/gu);
  return m ? m.length : 0;
}

function limpiar(texto: string): string {
  return texto.replace(/\s+/g, ' ').trim();
}

/** Profundidad de una numeración como "2.3.1" (3) o "Capítulo 2" (1). */
function profundidadNumeracion(texto: string): number | null {
  const m = texto.match(/^(\d{1,2}(?:\.\d{1,2}){0,3})\.?\s/);
  if (m) return m[1]!.split('.').length;
  if (NUMERADO.test(texto)) return 1;
  return null;
}

function esMayusculas(texto: string): boolean {
  const letras = texto.replace(/[^\p{L}]/gu, '');
  return letras.length >= 4 && letras === letras.toLocaleUpperCase('es') && /\p{Lu}/u.test(letras);
}

/** Tamaño de letra del cuerpo: el más usado, contando caracteres. */
export function tamanoCuerpo(bloques: Bloque[]): number | null {
  const conteo = new Map<number, number>();
  for (const b of bloques) {
    if (!b.tamano) continue;
    const t = Math.round(b.tamano * 2) / 2;
    conteo.set(t, (conteo.get(t) ?? 0) + b.texto.length);
  }
  let mejor: number | null = null;
  let max = 0;
  for (const [t, n] of conteo)
    if (n > max) {
      max = n;
      mejor = t;
    }
  return mejor;
}

/** Decide si un bloque es un título y de qué nivel (1 es el más grande), o null si es texto. */
export function nivelDeTitulo(
  b: Bloque,
  cuerpo: number | null,
  tamanosTitulo: number[],
): number | null {
  const texto = limpiar(b.texto);
  if (b.nivel) return b.nivel;
  if (!texto || texto.length > 110 || SOLO_NUMERO.test(texto) || b.lista) return null;
  if (/[.;,:]$/.test(texto) && !NUMERADO.test(texto)) return null;
  if (contarPalabras(texto) > 14) return null;
  if (cuerpo && b.tamano && b.tamano >= cuerpo * 1.15) {
    const i = tamanosTitulo.findIndex((t) => b.tamano! >= t - 0.25);
    return (i === -1 ? tamanosTitulo.length : i) + 1;
  }
  const prof = profundidadNumeracion(texto);
  if (prof !== null && !/[.;,]$/.test(texto)) return Math.min(3, prof) + 1;
  if (esMayusculas(texto) && texto.length <= 70) return 2;
  return null;
}

/**
 * Une líneas de un PDF en párrafos y arregla las palabras partidas con guion.
 * Un párrafo termina en una línea vacía o en una línea corta que cierra con punto
 * (las líneas de en medio llegan casi hasta el margen).
 */
export function unirLineas(lineas: string[]): string[] {
  const largos = lineas
    .map((l) => limpiar(l).length)
    .filter((n) => n > 0)
    .sort((a, b) => a - b);
  const tipico = largos.length ? largos[Math.floor(largos.length * 0.75)]! : 0;
  const parrafos: string[] = [];
  let actual = '';
  let largoUltima = 0;
  for (const bruta of lineas) {
    const linea = limpiar(bruta);
    if (!linea) {
      if (actual) parrafos.push(actual);
      actual = '';
      continue;
    }
    if (!actual) {
      actual = linea;
    } else if (/\p{L}-$/u.test(actual) && /^\p{Ll}/u.test(linea)) {
      actual = actual.slice(0, -1) + linea;
    } else if (
      /[.!?:]$/.test(actual) &&
      /^[\p{Lu}\d•\-–*¿¡]/u.test(linea) &&
      largoUltima < tipico * 0.85
    ) {
      parrafos.push(actual);
      actual = linea;
    } else {
      actual = `${actual} ${linea}`;
    }
    largoUltima = linea.length;
  }
  if (actual) parrafos.push(actual);
  return parrafos;
}

function aMarkdown(bloques: Bloque[]): string {
  const salida: string[] = [];
  let lineas: string[] = [];
  const vaciar = () => {
    salida.push(...unirLineas(lineas));
    lineas = [];
  };
  for (const b of bloques) {
    const texto = limpiar(b.texto);
    const vineta = texto.match(/^[•▪◦●\-–*]\s*(.+)$/);
    if (b.lista || vineta) {
      vaciar();
      salida.push(`- ${vineta ? vineta[1] : texto}`);
    } else if (b.tamano === undefined) {
      // Word y texto ya vienen en párrafos.
      vaciar();
      if (texto) salida.push(texto);
    } else {
      if (b.parrafoNuevo) lineas.push('');
      lineas.push(texto);
    }
  }
  vaciar();
  // Las viñetas seguidas van juntas; lo demás separado por una línea en blanco.
  return salida
    .map((p, i) =>
      i > 0 && !(p.startsWith('- ') && salida[i - 1]!.startsWith('- ')) ? `\n${p}` : p,
    )
    .join('\n')
    .trim();
}

/** Quita encabezados y pies de página que se repiten en muchas páginas del PDF. */
export function quitarRepetidos(bloques: Bloque[]): Bloque[] {
  const paginas = bloques.filter((b) => b.paginaNueva).length;
  if (paginas < 3) return bloques;
  const veces = new Map<string, number>();
  for (const b of bloques) {
    const k = limpiar(b.texto).replace(/\d+/g, '#').toLowerCase();
    veces.set(k, (veces.get(k) ?? 0) + 1);
  }
  return bloques.filter((b) => {
    const k = limpiar(b.texto).replace(/\d+/g, '#').toLowerCase();
    return k.length > 0 && (veces.get(k) ?? 0) < paginas * 0.6;
  });
}

function nombreSinExtension(archivo: string): string {
  const base = archivo.replace(/\.[a-z0-9]{1,5}$/i, '').replace(/[_]+/g, ' ');
  return limpiar(base) || 'Documento';
}

/** Quita la numeración de un título: "2.1 Vectores" → "Vectores". */
export function tituloLimpio(texto: string): string {
  const sin = limpiar(texto)
    .replace(/^(?:\d{1,2}(?:\.\d{1,2}){0,3}\.?|[IVXLC]{1,6}\.)\s+/, '')
    .replace(
      /^(cap[ií]tulo|unidad|tema|m[oó]dulo|secci[oó]n|parte|lecci[oó]n)\s+[\dIVXLC]+\s*[.:-]?\s*/i,
      '',
    );
  const final = sin || limpiar(texto);
  // LOS TÍTULOS EN MAYÚSCULAS se pasan a tipo oración.
  if (esMayusculas(final)) {
    const min = final.toLocaleLowerCase('es');
    return min.charAt(0).toLocaleUpperCase('es') + min.slice(1);
  }
  return final;
}

const PALABRAS_POR_PARTE = 700;

/** Parte un texto sin títulos en trozos de tamaño parecido, sin cortar párrafos. */
function partirSinTitulos(contenido: string): Seccion[] {
  const parrafos = contenido.split(/\n{2,}/);
  const partes: string[][] = [[]];
  let palabras = 0;
  for (const p of parrafos) {
    const n = contarPalabras(p);
    if (palabras > 0 && palabras + n > PALABRAS_POR_PARTE) {
      partes.push([]);
      palabras = 0;
    }
    partes[partes.length - 1]!.push(p);
    palabras += n;
  }
  return partes.map((ps, i) => {
    const texto = ps.join('\n\n');
    const clave = palabrasClave(texto, 2);
    return {
      titulo: `Parte ${i + 1}${clave.length ? `: ${clave.join(', ')}` : ''}`,
      nivel: 1,
      contenido: texto,
      palabras: contarPalabras(texto),
    };
  });
}

/**
 * Convierte los bloques de un documento en secciones. Se toma como sección cada título
 * del nivel más alto que aparezca al menos dos veces; los subtítulos quedan dentro como "##".
 */
export function estructurarDocumento(bloquesBrutos: Bloque[], archivo: string): DocumentoLeido {
  const bloques = quitarRepetidos(bloquesBrutos.filter((b) => limpiar(b.texto)));
  const cuerpo = tamanoCuerpo(bloques);
  const tamanosTitulo = cuerpo
    ? [
        ...new Set(
          bloques
            .filter((b) => b.tamano && b.tamano >= cuerpo * 1.15)
            .map((b) => Math.round(b.tamano! * 2) / 2),
        ),
      ].sort((a, b) => b - a)
    : [];
  const niveles = bloques.map((b) => nivelDeTitulo(b, cuerpo, tamanosTitulo));

  // Nivel de sección: el más alto con al menos dos títulos. Un único título más grande es el del documento.
  const conteo = new Map<number, number>();
  for (const n of niveles) if (n !== null) conteo.set(n, (conteo.get(n) ?? 0) + 1);
  const ordenados = [...conteo.keys()].sort((a, b) => a - b);
  const nivelSeccion = ordenados.find((n) => (conteo.get(n) ?? 0) >= 2) ?? null;

  let titulo = nombreSinExtension(archivo);
  const primerTitulo = niveles.findIndex(
    (n) => n !== null && (nivelSeccion === null || n < nivelSeccion),
  );
  if (primerTitulo !== -1 && primerTitulo < 5) titulo = tituloLimpio(bloques[primerTitulo]!.texto);

  const crudas: { titulo: string; nivel: number; bloques: Bloque[] }[] = [];
  let actual: { titulo: string; nivel: number; bloques: Bloque[] } = {
    titulo: 'Introducción',
    nivel: 1,
    bloques: [],
  };
  bloques.forEach((b, i) => {
    const n = niveles[i] ?? null;
    if (i === primerTitulo) return;
    if (nivelSeccion !== null && n === nivelSeccion) {
      crudas.push(actual);
      actual = { titulo: tituloLimpio(b.texto), nivel: 1, bloques: [] };
    } else if (nivelSeccion !== null && n !== null && n > nivelSeccion) {
      const marca = n - nivelSeccion === 1 ? '##' : '###';
      actual.bloques.push({ texto: `${marca} ${tituloLimpio(b.texto)}` });
    } else {
      actual.bloques.push(b);
    }
  });
  crudas.push(actual);

  let secciones: Seccion[] = crudas
    .map((s) => {
      const contenido = aMarkdown(s.bloques);
      return { titulo: s.titulo, nivel: s.nivel, contenido, palabras: contarPalabras(contenido) };
    })
    .filter((s) => s.palabras > 0 || s.titulo !== 'Introducción');

  // Una introducción muy corta se une a la primera sección.
  if (
    secciones.length > 1 &&
    secciones[0]!.titulo === 'Introducción' &&
    secciones[0]!.palabras < 40
  ) {
    const [intro, primera] = secciones;
    secciones = [
      {
        ...primera!,
        contenido: `${intro!.contenido}\n\n${primera!.contenido}`.trim(),
        palabras: intro!.palabras + primera!.palabras,
      },
      ...secciones.slice(2),
    ];
  }
  if (nivelSeccion === null) {
    secciones = partirSinTitulos(secciones.map((s) => s.contenido).join('\n\n'));
  }
  secciones = secciones.filter((s) => s.palabras > 0 || secciones.length === 1);
  return { titulo, secciones, palabras: secciones.reduce((s, x) => s + x.palabras, 0) };
}

/** Pesos (en %) de cada sección según su extensión: suman 100 y ninguno baja de 5. */
export function pesosPorExtension(palabras: number[]): number[] {
  if (palabras.length === 0) return [];
  const minimo = Math.min(5, Math.floor(100 / palabras.length));
  const total = palabras.reduce((s, p) => s + Math.max(1, p), 0);
  const libres = 100 - minimo * palabras.length;
  const crudos = palabras.map((p) => minimo + (libres * Math.max(1, p)) / total);
  const base = crudos.map(Math.floor);
  let falta = 100 - base.reduce((s, x) => s + x, 0);
  // Reparto por mayor residuo para que sumen exactamente 100.
  const orden = crudos.map((c, i) => [c - Math.floor(c), i] as const).sort((a, b) => b[0] - a[0]);
  for (const [, i] of orden) {
    if (falta <= 0) break;
    base[i]!++;
    falta--;
  }
  return base;
}

const VACIAS = new Set(
  'para como pero porque cuando donde desde hasta entre sobre tiene tienen puede pueden este esta estos estas ese esa esos esas aquel cual cuales quien quienes cuyo cuya todo toda todos todas otro otra otros otras mismo misma tambien también ademas además entonces mientras durante segun según tanto tambien hacer hace hacen haber sido siendo será serán estar están estaba antes despues después luego mucho muchos mucha muchas poco pocos menos mayor menor mejor peor cada parte forma manera ejemplo caso casos tipo tipos través traves nuestro nuestra vuestro sus suyo suya ellos ellas usted ustedes debe deben dentro fuera siempre nunca ningun ninguna algun alguna algunos algunas aunque sino solo sólo bien había hemos habia tener tenía tenia siguiente anterior primero primera segundo segunda puede figura tabla página pagina capitulo capítulo unidad sección seccion'.split(
    ' ',
  ),
);

export function normalizarPalabra(p: string): string {
  return p.toLocaleLowerCase('es').normalize('NFD').replace(/\p{M}/gu, '');
}

/** Palabras que más se repiten en un texto (sin palabras vacías), en su forma más común. */
export function palabrasClave(texto: string, cuantas = 5): string[] {
  const conteo = new Map<string, { n: number; formas: Map<string, number> }>();
  for (const p of texto.match(/\p{L}{5,}/gu) ?? []) {
    const k = normalizarPalabra(p);
    if (VACIAS.has(k) || VACIAS.has(p.toLocaleLowerCase('es'))) continue;
    const e = conteo.get(k) ?? { n: 0, formas: new Map() };
    e.n++;
    const forma = p.toLocaleLowerCase('es');
    e.formas.set(forma, (e.formas.get(forma) ?? 0) + 1);
    conteo.set(k, e);
  }
  return [...conteo.values()]
    .filter((e) => e.n >= 2)
    .sort((a, b) => b.n - a.n)
    .slice(0, cuantas)
    .map((e) => [...e.formas.entries()].sort((a, b) => b[1] - a[1])[0]![0]);
}

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

export interface FechaExamen {
  fecha: Date;
  /** Fragmento del texto donde apareció. */
  contexto: string;
}

/**
 * Fechas de evaluaciones mencionadas en el texto ("el parcial es el 15 de noviembre",
 * "Examen final: 02/12/2026"). Solo devuelve fechas desde hoy, ordenadas.
 */
export function fechasDeExamen(texto: string, hoy: Date): FechaExamen[] {
  const plano = texto.replace(/\s+/g, ' ');
  const encontradas: FechaExamen[] = [];
  const evaluacion =
    /(parcial|examen|quiz|evaluaci[oó]n|prueba|previo|sustentaci[oó]n|entrega|final)/gi;
  let m: RegExpExecArray | null;
  while ((m = evaluacion.exec(plano))) {
    // Se mira solo el resto de la oración, para no tomar fechas de otra frase.
    const ventana = plano.slice(m.index, m.index + 90).split(/[.!?;]\s/)[0]!;
    let fecha: Date | null = null;
    const larga = ventana.match(
      new RegExp(`(\\d{1,2})\\s+de\\s+(${MESES.join('|')})(?:\\s+(?:de|del)\\s+(\\d{4}))?`, 'i'),
    );
    const corta = ventana.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4}|\d{2})\b/);
    if (larga) {
      const mes = MESES.indexOf(larga[2]!.toLowerCase());
      let anio = larga[3] ? Number(larga[3]) : hoy.getFullYear();
      fecha = new Date(anio, mes, Number(larga[1]));
      // Sin año y ya pasó: es del año siguiente.
      if (!larga[3] && fecha < new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())) {
        anio++;
        fecha = new Date(anio, mes, Number(larga[1]));
      }
    } else if (corta) {
      const anio = corta[3]!.length === 2 ? 2000 + Number(corta[3]) : Number(corta[3]);
      fecha = new Date(anio, Number(corta[2]) - 1, Number(corta[1]));
    }
    if (!fecha || Number.isNaN(fecha.getTime())) continue;
    const valida = fecha.getDate() === Number((larga ?? corta)![1]);
    const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    if (valida && fecha >= inicioHoy)
      encontradas.push({ fecha, contexto: limpiar(ventana).slice(0, 80) });
  }
  const unicas = new Map(encontradas.map((f) => [f.fecha.getTime(), f]));
  return [...unicas.values()].sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
}

export interface Definicion {
  termino: string;
  definicion: string;
}

/**
 * Definiciones del texto para tarjetas de repaso:
 * "Término: explicación", "Término - explicación" o "El término es/se define como …".
 */
export function definiciones(contenido: string, maximo = 12): Definicion[] {
  const salida: Definicion[] = [];
  const vistos = new Set<string>();
  const agregar = (termino: string, definicion: string) => {
    const t = limpiar(termino)
      .replace(/^[-*•]\s*/, '')
      .replace(/\*\*/g, '');
    const d = limpiar(definicion);
    const k = normalizarPalabra(t);
    if (t.length < 3 || contarPalabras(t) > 6 || contarPalabras(d) < 4 || vistos.has(k)) return;
    if (/^(ejemplo|nota|figura|tabla|fuente|p[aá]gina)$/i.test(t)) return;
    vistos.add(k);
    salida.push({ termino: t, definicion: d.length > 280 ? `${d.slice(0, 277)}…` : d });
  };
  for (const linea of contenido.split('\n')) {
    const l = linea.replace(/^#+\s*/, '').trim();
    const dosPuntos = l.match(/^(?:[-*•]\s*)?([^:.;]{3,60}):\s+(.{15,})$/);
    if (dosPuntos) {
      agregar(dosPuntos[1]!, dosPuntos[2]!);
      continue;
    }
    for (const oracion of l.split(/(?<=[.!?])\s+/)) {
      const es = oracion.match(
        /^(?:(?:El|La|Los|Las|Un|Una)\s+)?([\p{L}\s]{3,50}?)\s+(?:es|son|se define como|se conoce como|consiste en|se refiere a)\s+(.{15,})$/u,
      );
      if (es && /^\p{Lu}/u.test(oracion)) agregar(es[1]!, es[2]!.replace(/\.$/, ''));
    }
    if (salida.length >= maximo) break;
  }
  return salida.slice(0, maximo);
}

/** Pesos (en %) de las secciones: por importancia si se calculó, si no por extensión. */
export function pesosDeSecciones(secciones: Seccion[]): number[] {
  if (secciones.length > 0 && secciones.every((s) => s.importancia !== undefined))
    return pesosPorExtension(secciones.map((s) => s.importancia!));
  return pesosPorExtension(secciones.map((s) => s.palabras));
}

/** Tarjetas de repaso de una sección: las ya armadas o, si no hay, las definiciones del texto. */
export function tarjetasDeSeccion(s: Seccion, maximo = 6): { frente: string; reverso: string }[] {
  if (s.tarjetas) return s.tarjetas.slice(0, maximo);
  return definiciones(s.contenido, maximo).map((d) => ({
    frente: `¿Qué es ${d.termino}?`,
    reverso: d.definicion,
  }));
}

/**
 * Listas con un enunciado ("Tipos de energía:" seguido de viñetas) para tarjetas de repaso:
 * el enunciado es la pregunta y las viñetas la respuesta.
 */
export function listasConEnunciado(contenido: string, maximo = 4): Definicion[] {
  const salida: Definicion[] = [];
  const lineas = contenido.split('\n').map((l) => l.trim());
  for (let i = 0; i < lineas.length && salida.length < maximo; i++) {
    const enunciado = lineas[i]!.replace(/^#+\s*/, '');
    if (!/:$/.test(enunciado) || enunciado.startsWith('- ') || contarPalabras(enunciado) > 12)
      continue;
    const items: string[] = [];
    let j = i + 1;
    while (j < lineas.length && !lineas[j]) j++;
    while (j < lineas.length && lineas[j]!.startsWith('- ')) items.push(lineas[j++]!.slice(2));
    if (items.length < 2) continue;
    salida.push({
      termino: enunciado.slice(0, -1).trim(),
      definicion: items.slice(0, 8).join('; '),
    });
  }
  return salida;
}

const ENFASIS =
  /\b(importante|fundamental|clave|esencial|recuerd[ae]|ojo|examen|parcial|evaluar[aá]|siempre|nunca|principal(?:es)?)\b/gi;
const FORMULA = /[=≈≠≤≥√∑∫π^²³]|\b\d+(?:[.,]\d+)?\s*[a-zA-Z]{1,3}\b/g;

/** Rasgos que miden cuánto pesa y qué tan difícil es una sección. */
export function rasgosDeSeccion(s: Seccion, clavesDelDocumento: Set<string>) {
  const palabras = Math.max(1, s.palabras);
  const claves = palabrasClave(s.contenido, 8).map(normalizarPalabra);
  // Centralidad: cuántas de sus palabras clave también son clave en el resto del documento.
  const compartidas = claves.filter((k) => clavesDelDocumento.has(k)).length;
  const enfasis = (s.contenido.match(ENFASIS) ?? []).length;
  const formulas = (s.contenido.match(FORMULA) ?? []).length / palabras;
  const largas = (s.contenido.match(/\p{L}{11,}/gu) ?? []).length / palabras;
  const oraciones = Math.max(1, (s.contenido.match(/[.!?](\s|$)/g) ?? []).length);
  const porOracion = palabras / oraciones;
  const definidas = definiciones(s.contenido, 20).length;
  return { palabras, compartidas, enfasis, formulas, largas, porOracion, definidas };
}

/**
 * Analiza el documento sin IA: da a cada sección una importancia de 1 a 10 (por extensión,
 * por cuánto se relaciona con el resto, por las palabras de énfasis y las definiciones),
 * estima la dificultad (fórmulas, palabras técnicas largas y oraciones largas) y arma las
 * tarjetas de repaso con las definiciones y las listas con enunciado.
 */
export function analizarSecciones(doc: DocumentoLeido): DocumentoLeido {
  const todo = doc.secciones.map((s) => s.contenido).join('\n\n');
  const clavesDoc = new Set(palabrasClave(todo, 40).map(normalizarPalabra));
  const rasgos = doc.secciones.map((s) => rasgosDeSeccion(s, clavesDoc));
  const maxPalabras = Math.max(1, ...rasgos.map((r) => r.palabras));
  const secciones = doc.secciones.map((s, i) => {
    const r = rasgos[i]!;
    const puntaje =
      0.45 * (Math.log(1 + r.palabras) / Math.log(1 + maxPalabras)) +
      0.25 * Math.min(1, r.compartidas / 4) +
      0.15 * Math.min(1, r.enfasis / 3) +
      0.15 * Math.min(1, r.definidas / 3);
    const importancia = Math.max(1, Math.min(10, Math.round(1 + puntaje * 9)));
    const dureza =
      Math.min(1, r.formulas * 25) * 0.45 +
      Math.min(1, r.largas * 8) * 0.3 +
      Math.min(1, Math.max(0, r.porOracion - 12) / 18) * 0.25;
    const dificultad: Seccion['dificultad'] =
      dureza >= 0.5 ? 'alta' : dureza >= 0.25 ? 'media' : 'baja';
    const tarjetas = [
      ...definiciones(s.contenido, 6).map((d) => ({
        frente: `¿Qué es ${d.termino}?`,
        reverso: d.definicion,
      })),
      ...listasConEnunciado(s.contenido).map((d) => ({
        frente: `${d.termino}: ¿cuáles son?`,
        reverso: d.definicion,
      })),
    ].slice(0, 8);
    return { ...s, importancia, dificultad, tarjetas };
  });
  return { ...doc, secciones };
}
