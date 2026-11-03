import type { Area } from '../catalogo';
import type { Fuerza } from '../fuerzas';

export interface Parametro {
  clave: string;
  etiqueta: string;
  unidad: string;
  valor: number;
  min: number;
  max: number;
  /** true si debe ser un número entero. */
  entero?: boolean;
}

export interface Paso {
  /** Qué se hace y por qué, en palabras sencillas. */
  descripcion: string;
  /** La fórmula o el despeje con los números reemplazados. */
  calculo?: string;
  /** El resultado con su unidad. */
  valor?: string;
}

export interface Diagrama {
  cuerpo: 'bloque' | 'particula';
  /** Inclinación del plano en grados (0 = horizontal). */
  inclinacion: number;
  fuerzas: Fuerza[];
}

export interface Solucion {
  enunciado: string;
  pasos: Paso[];
  comprobacion: string;
  /** true si la comprobación se cumple con los valores calculados. */
  comprobado: boolean;
  diagrama?: Diagrama;
  /** Aviso cuando los datos no tienen sentido físico o no aplica la fórmula. */
  aviso?: string;
}

export interface Generador {
  id: string;
  /** Áreas en las que se muestra primero. */
  areas: Area[];
  titulo: string;
  /** Tema en el que encaja, para sugerirlo al guardar. */
  tema: string;
  parametros: Parametro[];
  resolver: (valores: Record<string, number>) => Solucion;
}

/** Número con coma decimal y punto de miles, como se escribe en Colombia. */
export function num(n: number, decimales = 2): string {
  const redondeado = Math.round(n * 10 ** decimales) / 10 ** decimales;
  const [entero = '0', fraccion] = Math.abs(redondeado).toFixed(decimales).split('.');
  const conMiles = entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const frac = (fraccion ?? '').replace(/0+$/, '');
  return `${redondeado < 0 ? '−' : ''}${conMiles}${frac ? `,${frac}` : ''}`;
}

/** Valores por defecto de los parámetros de un generador. */
export function valoresIniciales(g: Generador): Record<string, number> {
  return Object.fromEntries(g.parametros.map((p) => [p.clave, p.valor]));
}

/** Lleva cada valor al rango permitido (y a entero si hace falta). */
export function normalizarValores(g: Generador, valores: Record<string, number>) {
  return Object.fromEntries(
    g.parametros.map((p) => {
      const v = valores[p.clave] ?? p.valor;
      const acotado = Math.min(p.max, Math.max(p.min, Number.isFinite(v) ? v : p.valor));
      return [p.clave, p.entero ? Math.round(acotado) : acotado];
    }),
  );
}
