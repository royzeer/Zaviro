/**
 * Conversor mínimo de Markdown a HTML para los apuntes.
 * Primero escapa todo el HTML del texto, así que el resultado es seguro de insertar.
 * Soporta: títulos (#, ##, ###), negrita, cursiva, código en línea y en bloque,
 * listas con viñetas y numeradas, citas, enlaces http(s) y párrafos.
 */

export function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function enLinea(texto: string): string {
  const codigos: string[] = [];
  let t = escaparHtml(texto).replace(/`([^`]+)`/g, (_, c: string) => {
    codigos.push(c);
    return `\uE000${codigos.length - 1}\uE000`;
  });
  t = t
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
    );
  return t.replace(/\uE000(\d+)\uE000/g, (_, i: string) => `<code>${codigos[Number(i)]}</code>`);
}

export function markdownAHtml(fuente: string): string {
  const lineas = fuente.replace(/\r\n?/g, '\n').split('\n');
  const salida: string[] = [];
  let parrafo: string[] = [];
  let lista: { tipo: 'ul' | 'ol'; items: string[] } | null = null;

  const cerrarParrafo = () => {
    if (parrafo.length) salida.push(`<p>${parrafo.map(enLinea).join('<br>')}</p>`);
    parrafo = [];
  };
  const cerrarLista = () => {
    if (lista)
      salida.push(
        `<${lista.tipo}>${lista.items.map((i) => `<li>${enLinea(i)}</li>`).join('')}</${lista.tipo}>`,
      );
    lista = null;
  };

  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i]!;
    if (linea.trim().startsWith('```')) {
      cerrarParrafo();
      cerrarLista();
      const bloque: string[] = [];
      i++;
      while (i < lineas.length && !lineas[i]!.trim().startsWith('```')) bloque.push(lineas[i++]!);
      salida.push(`<pre><code>${escaparHtml(bloque.join('\n'))}</code></pre>`);
      continue;
    }
    const titulo = /^(#{1,3})\s+(.*)$/.exec(linea);
    const vineta = /^\s*[-*]\s+(.*)$/.exec(linea);
    const numero = /^\s*\d+[.)]\s+(.*)$/.exec(linea);
    const cita = /^>\s?(.*)$/.exec(linea);
    if (titulo) {
      cerrarParrafo();
      cerrarLista();
      const n = titulo[1]!.length + 1;
      salida.push(`<h${n}>${enLinea(titulo[2]!)}</h${n}>`);
    } else if (vineta || numero) {
      cerrarParrafo();
      const tipo = vineta ? 'ul' : 'ol';
      if (lista && lista.tipo !== tipo) cerrarLista();
      lista ??= { tipo, items: [] };
      lista.items.push((vineta ?? numero)![1]!);
    } else if (cita) {
      cerrarParrafo();
      cerrarLista();
      salida.push(`<blockquote>${enLinea(cita[1]!)}</blockquote>`);
    } else if (linea.trim() === '') {
      cerrarParrafo();
      cerrarLista();
    } else {
      cerrarLista();
      parrafo.push(linea);
    }
  }
  cerrarParrafo();
  cerrarLista();
  return salida.join('\n');
}

/** Texto plano de un apunte para vistas previas cortas. */
export function resumenMarkdown(fuente: string, largo = 140): string {
  const plano = fuente
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*`_-]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  return plano.length > largo ? `${plano.slice(0, largo - 1).trimEnd()}…` : plano;
}
