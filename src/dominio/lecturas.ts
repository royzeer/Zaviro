import type { EstadoLectura } from './catalogo';

/** Lecturas académicas: cola de lectura y banco de citas con su fuente. */

export const NOMBRE_ESTADO_LECTURA: Record<EstadoLectura, string> = {
  porLeer: 'Por leer',
  leyendo: 'Leyendo',
  leida: 'Leída',
};

export interface LecturaBasica {
  id: string;
  referencia: string;
  estado: EstadoLectura;
  citas: { texto: string; fuente: string; pagina?: string | undefined }[];
}

/** Quita tildes y mayúsculas para buscar sin importar cómo se escriba. */
export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

export function contarPorEstado(lecturas: LecturaBasica[]): Record<EstadoLectura, number> {
  const r: Record<EstadoLectura, number> = { porLeer: 0, leyendo: 0, leida: 0 };
  for (const l of lecturas) r[l.estado]++;
  return r;
}

/** Cola de lectura: primero lo que estás leyendo, luego lo que falta, conservando el orden dado. */
export function colaDeLectura<T extends LecturaBasica>(lecturas: T[]): T[] {
  return [
    ...lecturas.filter((l) => l.estado === 'leyendo'),
    ...lecturas.filter((l) => l.estado === 'porLeer'),
  ];
}

export interface CitaEnBanco {
  lecturaId: string;
  indice: number;
  texto: string;
  /** La fuente de la cita, o la referencia de la lectura si la cita no tiene una propia. */
  fuente: string;
  pagina?: string | undefined;
}

/** Todas las citas de todas las lecturas, filtradas por texto, fuente o referencia. */
export function bancoDeCitas(lecturas: LecturaBasica[], buscar = ''): CitaEnBanco[] {
  const q = normalizar(buscar);
  const todas = lecturas.flatMap((l) =>
    l.citas.map((c, indice) => ({
      lecturaId: l.id,
      indice,
      texto: c.texto,
      fuente: c.fuente.trim() || l.referencia,
      pagina: c.pagina,
      referencia: l.referencia,
    })),
  );
  return todas
    .filter((c) => !q || normalizar(`${c.texto} ${c.fuente} ${c.referencia}`).includes(q))
    .map(({ referencia: _r, ...c }) => c);
}

/** Texto listo para copiar: la cita entre comillas con su fuente y página. */
export function formatoCita(c: Pick<CitaEnBanco, 'texto' | 'fuente' | 'pagina'>): string {
  const pagina = c.pagina?.trim() ? `, p. ${c.pagina.trim()}` : '';
  return `"${c.texto.trim()}" (${c.fuente.trim()}${pagina})`;
}
