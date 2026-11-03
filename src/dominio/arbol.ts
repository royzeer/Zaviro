import { hierarchy, tree } from 'd3-hierarchy';
import { forceCollide, forceSimulation, forceX, forceY, type SimulationNodeDatum } from 'd3-force';
import { ORDEN_NIVEL, type Nivel } from './catalogo';

/**
 * Cálculo puro de la forma del árbol vivo (sin React ni DOM), para poder probarlo.
 * Copa: d3-hierarchy reparte materias y temas en abanico sobre el tronco.
 * Raíces: d3-force acomoda los conceptos bajo tierra, más profundos cuanto más
 * bajo es su nivel de origen y atraídos hacia los temas que sostienen.
 */

export interface EntradaArbol {
  nivelPerfil: Nivel;
  materias: { id: string; nombre: string; color: string }[];
  temas: { id: string; materiaId: string; titulo: string; pesoParcial: number; dominio: number }[];
  conceptos: { id: string; nombre: string; nivelOrigen: Nivel; temaIds: string[] }[];
}

export interface Medidas {
  ancho: number;
  alto: number;
  suelo: number;
}

export const MEDIDAS: Medidas = { ancho: 640, alto: 540, suelo: 300 };

export interface HojaArbol {
  id: string;
  materiaId: string;
  titulo: string;
  x: number;
  y: number;
  r: number;
  dominio: number;
}

export interface RamaArbol {
  id: string;
  nombre: string;
  color: string;
  x: number;
  y: number;
}

export interface RaizArbol {
  id: string;
  nombre: string;
  nivelOrigen: Nivel;
  x: number;
  y: number;
  /** Cuántos niveles por debajo del perfil está su origen (0 = mismo nivel). */
  profundidad: number;
  temaIds: string[];
  /** Si la etiqueta va arriba del nodo para no chocar con la vecina. */
  etiquetaArriba: boolean;
}

export interface FormaArbol {
  medidas: Medidas;
  tronco: { x: number; base: number; copa: number };
  ramas: RamaArbol[];
  hojas: HojaArbol[];
  raices: RaizArbol[];
}

const ANGULO_MAX = (78 * Math.PI) / 180;

function polar(cx: number, cy: number, radio: number, angulo: number) {
  return { x: cx + radio * Math.sin(angulo), y: cy - radio * Math.cos(angulo) };
}

/** Radio de una hoja según el peso del tema en el examen. */
export function radioHoja(pesoParcial: number): number {
  return 7 + (Math.min(100, Math.max(0, pesoParcial)) / 100) * 9;
}

/** Profundidad (en niveles) de una raíz respecto al nivel del perfil. */
export function profundidadRaiz(nivelOrigen: Nivel, nivelPerfil: Nivel): number {
  return Math.max(0, ORDEN_NIVEL[nivelPerfil] - ORDEN_NIVEL[nivelOrigen]);
}

export function calcularArbol(entrada: EntradaArbol, medidas: Medidas = MEDIDAS): FormaArbol {
  const cx = medidas.ancho / 2;
  const copa = medidas.suelo - 70;
  const temasPorMateria = new Map<string, EntradaArbol['temas']>();
  for (const t of entrada.temas) {
    const lista = temasPorMateria.get(t.materiaId) ?? [];
    lista.push(t);
    temasPorMateria.set(t.materiaId, lista);
  }

  type Nodo = { id: string; hijos?: Nodo[] };
  const datos: Nodo = {
    id: 'raiz',
    hijos: entrada.materias.map((m) => ({
      id: m.id,
      hijos: (temasPorMateria.get(m.id) ?? []).map((t) => ({ id: t.id })),
    })),
  };
  const raiz = hierarchy(datos, (d) => d.hijos);
  // x en [0, 1] se convierte en ángulo; y es la profundidad (1 materia, 2 tema).
  tree<Nodo>()
    .size([1, 2])
    .separation((a, b) => (a.parent === b.parent ? 1 : 1.6))(raiz);

  const angulo = (x: number) =>
    entrada.materias.length <= 1 && entrada.temas.length <= 1 ? 0 : (x - 0.5) * 2 * ANGULO_MAX;
  const porId = new Map(entrada.temas.map((t) => [t.id, t]));
  const materiaPorId = new Map(entrada.materias.map((m) => [m.id, m]));
  const radioCopa = Math.min(medidas.ancho / 2 - 40, copa - 30);

  const ramas: RamaArbol[] = [];
  const hojas: HojaArbol[] = [];
  for (const n of raiz.descendants()) {
    if (n.depth === 1) {
      const m = materiaPorId.get(n.data.id)!;
      const p = polar(cx, copa, radioCopa * 0.48, angulo(n.x ?? 0.5));
      ramas.push({ id: m.id, nombre: m.nombre, color: m.color, ...p });
    } else if (n.depth === 2) {
      const t = porId.get(n.data.id)!;
      // Alterna un poco el radio para que las hojas vecinas no se pisen.
      const alterna = (n.parent?.children?.indexOf(n) ?? 0) % 2 === 0 ? 1 : 0.9;
      const p = polar(cx, copa, radioCopa * alterna, angulo(n.x ?? 0.5));
      hojas.push({
        id: t.id,
        materiaId: t.materiaId,
        titulo: t.titulo,
        dominio: t.dominio,
        r: radioHoja(t.pesoParcial),
        ...p,
      });
    }
  }

  // Raíces con d3-force.
  const hojaPorId = new Map(hojas.map((h) => [h.id, h]));
  const temaIdsVisibles = new Set(hojas.map((h) => h.id));
  const conceptos = entrada.conceptos.filter((c) => c.temaIds.some((t) => temaIdsVisibles.has(t)));
  const espacio = medidas.alto - medidas.suelo - 40;
  const pasos = 6;
  const yObjetivo = (c: (typeof conceptos)[number]) =>
    medidas.suelo +
    40 +
    (profundidadRaiz(c.nivelOrigen, entrada.nivelPerfil) / pasos) * (espacio - 30);
  const xObjetivo = (c: (typeof conceptos)[number]) => {
    const xs = c.temaIds
      .map((t) => hojaPorId.get(t)?.x)
      .filter((x): x is number => x !== undefined);
    const media = xs.reduce((s, x) => s + x, 0) / xs.length;
    // Se acercan al tronco: las raíces viven bajo la copa.
    return cx + (media - cx) * 0.75;
  };

  type NodoFuerza = SimulationNodeDatum & { c: (typeof conceptos)[number]; tx: number; ty: number };
  const nodos: NodoFuerza[] = conceptos.map((c, i) => ({
    c,
    tx: xObjetivo(c),
    ty: yObjetivo(c),
    x: xObjetivo(c) + ((i % 3) - 1),
    y: yObjetivo(c) + (i % 2 === 0 ? -16 : 16),
  }));
  forceSimulation(nodos)
    .force('x', forceX<NodoFuerza>((d) => d.tx).strength(0.12))
    .force('y', forceY<NodoFuerza>((d) => d.ty).strength(0.2))
    .force('choque', forceCollide<NodoFuerza>(40))
    .stop()
    .tick(300);

  const margen = 24;
  const raices: RaizArbol[] = nodos.map((n) => ({
    id: n.c.id,
    nombre: n.c.nombre,
    nivelOrigen: n.c.nivelOrigen,
    temaIds: n.c.temaIds.filter((t) => temaIdsVisibles.has(t)),
    profundidad: profundidadRaiz(n.c.nivelOrigen, entrada.nivelPerfil),
    x: Math.min(medidas.ancho - margen, Math.max(margen, n.x ?? n.tx)),
    y: Math.min(medidas.alto - margen, Math.max(medidas.suelo + 30, n.y ?? n.ty)),
    etiquetaArriba: false,
  }));
  // Si dos raíces quedan cerca en la misma franja, alterna sus etiquetas arriba y abajo.
  const ordenadas = [...raices].sort((a, b) => a.x - b.x);
  for (let i = 1; i < ordenadas.length; i++) {
    const previa = ordenadas[i - 1]!;
    const actual = ordenadas[i]!;
    if (actual.x - previa.x < 130 && Math.abs(actual.y - previa.y) < 40)
      actual.etiquetaArriba = !previa.etiquetaArriba;
  }

  return { medidas, tronco: { x: cx, base: medidas.suelo, copa }, ramas, hojas, raices };
}

/** Camino SVG curvo entre dos puntos. */
export function curva(x1: number, y1: number, x2: number, y2: number): string {
  const my = (y1 + y2) / 2;
  return `M${x1.toFixed(1)},${y1.toFixed(1)} C${x1.toFixed(1)},${my.toFixed(1)} ${x2.toFixed(1)},${my.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`;
}
