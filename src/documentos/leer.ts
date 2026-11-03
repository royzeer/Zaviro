// Extrae el texto de un archivo en el navegador. Nada se sube: el archivo se lee aquí
// y solo se guardan los apuntes que salen de él. Las librerías se cargan al usarlas.
import type { Bloque } from '@/dominio/documentos';

export const TIPOS_ACEPTADOS =
  '.pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown';
export const MAX_MB = 25;

export class ErrorDocumento extends Error {}

export function tipoDeArchivo(nombre: string): 'pdf' | 'docx' | 'texto' | 'doc' | null {
  const ext = nombre.toLowerCase().split('.').pop() ?? '';
  if (ext === 'pdf') return 'pdf';
  if (ext === 'docx') return 'docx';
  if (ext === 'doc') return 'doc';
  if (ext === 'txt' || ext === 'md' || ext === 'markdown') return 'texto';
  return null;
}

/** Texto plano o Markdown: "#" son títulos, "-" viñetas y las líneas en blanco separan párrafos. */
export function bloquesDeTexto(texto: string): Bloque[] {
  const bloques: Bloque[] = [];
  let parrafo: string[] = [];
  const cerrar = () => {
    if (parrafo.length) bloques.push({ texto: parrafo.join(' ') });
    parrafo = [];
  };
  for (const cruda of texto.replace(/\r\n?/g, '\n').split('\n')) {
    const linea = cruda.trim();
    const titulo = linea.match(/^(#{1,6})\s+(.+)$/);
    const vineta = linea.match(/^(?:[-*•]|\d+[.)])\s+(.+)$/);
    if (!linea) cerrar();
    else if (titulo) {
      cerrar();
      bloques.push({ texto: titulo[2]!, nivel: titulo[1]!.length });
    } else if (vineta) {
      cerrar();
      bloques.push({ texto: vineta[1]!, lista: true });
    } else parrafo.push(linea);
  }
  cerrar();
  return bloques;
}

/** HTML de Word (convertido con mammoth) a bloques. Si no hay estilos de título, usa los párrafos en negrita. */
export function bloquesDeHtml(html: string): Bloque[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const hayTitulos = doc.querySelector('h1,h2,h3,h4,h5,h6') !== null;
  // Con estilo Título, los encabezados de Word bajan un nivel: el Título es el nombre del documento.
  const corrimiento = doc.querySelector('p.titulo-documento') ? 1 : 0;
  const bloques: Bloque[] = [];
  const texto = (el: Element) => (el.textContent ?? '').replace(/\s+/g, ' ').trim();
  for (const el of Array.from(doc.body.children)) {
    const etiqueta = el.tagName.toLowerCase();
    if (el.classList.contains('titulo-documento')) bloques.push({ texto: texto(el), nivel: 1 });
    else if (/^h[1-6]$/.test(etiqueta))
      bloques.push({ texto: texto(el), nivel: Number(etiqueta[1]) + corrimiento });
    else if (etiqueta === 'ul' || etiqueta === 'ol')
      el.querySelectorAll('li').forEach((li) => bloques.push({ texto: texto(li), lista: true }));
    else if (etiqueta === 'table')
      el.querySelectorAll('tr').forEach((tr) =>
        bloques.push({
          texto: Array.from(tr.children).map(texto).filter(Boolean).join(' | '),
        }),
      );
    else {
      const t = texto(el);
      if (!t) continue;
      const negrita = el.querySelector('strong,b');
      const todoNegrita = negrita !== null && texto(negrita) === t;
      if (!hayTitulos && todoNegrita && t.split(' ').length <= 12 && !/[.,;]$/.test(t))
        bloques.push({ texto: t, nivel: 2 });
      else bloques.push({ texto: t });
    }
  }
  return bloques;
}

interface ItemPdf {
  str: string;
  transform: number[];
  height: number;
  hasEOL?: boolean;
}

/** Arma las líneas de una página de PDF a partir de sus fragmentos de texto. */
export function lineasDePagina(items: ItemPdf[]): Bloque[] {
  const lineas: { texto: string; tamano: number; y: number }[] = [];
  let actual: { texto: string; tamano: number; y: number } | null = null;
  for (const it of items) {
    const y = it.transform[5] ?? 0;
    const tamano = Math.abs(it.height) || Math.hypot(it.transform[2] ?? 0, it.transform[3] ?? 0);
    if (!actual || Math.abs(y - actual.y) > Math.max(2, Math.min(tamano, actual.tamano) * 0.5)) {
      if (actual && actual.texto.trim()) lineas.push(actual);
      actual = { texto: it.str, tamano, y };
    } else {
      const necesitaEspacio =
        actual.texto && !/\s$/.test(actual.texto) && it.str && !/^\s/.test(it.str);
      actual.texto += (necesitaEspacio ? ' ' : '') + it.str;
      if (it.str.trim()) actual.tamano = Math.max(actual.tamano, tamano);
    }
  }
  if (actual && actual.texto.trim()) lineas.push(actual);

  const bloques: Bloque[] = [];
  lineas.forEach((l, i) => {
    const previa = lineas[i - 1];
    const salto = previa ? previa.y - l.y : 0;
    bloques.push({
      texto: l.texto.trim(),
      tamano: Math.round(l.tamano * 10) / 10,
      ...(i === 0 ? { paginaNueva: true } : {}),
      ...(previa && salto > Math.max(l.tamano, previa.tamano) * 1.9 ? { parrafoNuevo: true } : {}),
    });
  });
  return bloques;
}

async function leerPdf(datos: ArrayBuffer): Promise<Bloque[]> {
  const pdfjs = await import('pdfjs-dist');
  const { default: trabajador } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = trabajador;
  const tarea = pdfjs.getDocument({ data: new Uint8Array(datos) });
  let doc;
  try {
    doc = await tarea.promise;
  } catch (e) {
    if ((e as { name?: string }).name === 'PasswordException')
      throw new ErrorDocumento('El PDF tiene contraseña. Quítasela y vuelve a subirlo.');
    throw new ErrorDocumento('No se pudo abrir el PDF. Puede estar dañado.');
  }
  const bloques: Bloque[] = [];
  try {
    for (let n = 1; n <= doc.numPages; n++) {
      const pagina = await doc.getPage(n);
      const contenido = await pagina.getTextContent();
      bloques.push(
        ...lineasDePagina(contenido.items.filter((i) => 'str' in i) as unknown as ItemPdf[]),
      );
    }
  } finally {
    await tarea.destroy();
  }
  return bloques;
}

async function leerDocx(datos: ArrayBuffer): Promise<Bloque[]> {
  const { default: mammoth } = await import('mammoth');
  try {
    const { value } = await mammoth.convertToHtml(
      { arrayBuffer: datos },
      // El estilo Título de Word es el nombre del documento.
      {
        styleMap: [
          "p[style-name='Title'] => p.titulo-documento:fresh",
          "p[style-name='Título'] => p.titulo-documento:fresh",
        ],
      },
    );
    return bloquesDeHtml(value);
  } catch {
    throw new ErrorDocumento('No se pudo abrir el archivo de Word. Puede estar dañado.');
  }
}

/** Lee un archivo y devuelve sus bloques de texto. */
export async function leerArchivo(archivo: File): Promise<Bloque[]> {
  const tipo = tipoDeArchivo(archivo.name);
  if (tipo === 'doc')
    throw new ErrorDocumento(
      'Los .doc antiguos no se pueden leer. Guárdalo como .docx o PDF desde Word.',
    );
  if (!tipo) throw new ErrorDocumento('Sube un PDF, un Word (.docx) o un archivo de texto.');
  if (archivo.size > MAX_MB * 1024 * 1024)
    throw new ErrorDocumento(`El archivo pesa más de ${MAX_MB} MB.`);
  const datos = await archivo.arrayBuffer();
  const bloques =
    tipo === 'pdf'
      ? await leerPdf(datos)
      : tipo === 'docx'
        ? await leerDocx(datos)
        : bloquesDeTexto(new TextDecoder().decode(datos));
  const letras = bloques.reduce((s, b) => s + b.texto.replace(/\s/g, '').length, 0);
  if (letras < 40) {
    throw new ErrorDocumento(
      tipo === 'pdf'
        ? 'Este PDF no tiene texto que se pueda leer (parece una imagen escaneada). Prueba con el archivo original o con un PDF con texto.'
        : 'El archivo casi no tiene texto.',
    );
  }
  return bloques;
}
