import { describe, expect, it } from 'vitest';
import {
  cajaEtiqueta,
  calcularArbol,
  MEDIDAS,
  profundidadRaiz,
  radioHoja,
  ubicarEtiquetas,
  type EntradaArbol,
  type RaizArbol,
} from './arbol';

const entrada: EntradaArbol = {
  nivelPerfil: 'maestria',
  materias: [
    { id: 'm1', nombre: 'Econometría', color: '#3d6b8c' },
    { id: 'm2', nombre: 'Métodos', color: '#2e7d3c' },
  ],
  temas: [
    { id: 't1', materiaId: 'm1', titulo: 'MCO', pesoParcial: 50, dominio: 0.4 },
    { id: 't2', materiaId: 'm1', titulo: 'Heterocedasticidad', pesoParcial: 20, dominio: 0.8 },
    { id: 't3', materiaId: 'm2', titulo: 'Muestreo', pesoParcial: 100, dominio: 0.1 },
  ],
  conceptos: [
    { id: 'c1', nombre: 'Álgebra de matrices', nivelOrigen: 'profesional', temaIds: ['t1'] },
    { id: 'c2', nombre: 'Despejes', nivelOrigen: 'bachillerato', temaIds: ['t1', 't3'] },
    { id: 'c3', nombre: 'Inferencia causal', nivelOrigen: 'maestria', temaIds: ['t3'] },
    { id: 'c4', nombre: 'Sin temas visibles', nivelOrigen: 'bachillerato', temaIds: ['otro'] },
  ],
};

describe('forma del árbol', () => {
  const forma = calcularArbol(entrada);

  it('pone una rama por materia y una hoja por tema, sobre el suelo', () => {
    expect(forma.ramas).toHaveLength(2);
    expect(forma.hojas).toHaveLength(3);
    for (const h of forma.hojas) expect(h.y).toBeLessThan(MEDIDAS.suelo);
  });

  it('pone las raíces bajo tierra y omite las que no tocan temas del perfil', () => {
    expect(forma.raices.map((r) => r.id).sort()).toEqual(['c1', 'c2', 'c3']);
    for (const r of forma.raices) {
      expect(r.y).toBeGreaterThan(MEDIDAS.suelo);
      expect(r.y).toBeLessThanOrEqual(MEDIDAS.alto);
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.x).toBeLessThanOrEqual(MEDIDAS.ancho);
    }
  });

  it('las raíces de niveles inferiores quedan más profundas', () => {
    const y = Object.fromEntries(forma.raices.map((r) => [r.id, r.y]));
    expect(y.c2!).toBeGreaterThan(y.c1!);
    expect(y.c1!).toBeGreaterThan(y.c3!);
  });

  it('el tamaño de la hoja crece con el peso en el examen', () => {
    expect(radioHoja(100)).toBeGreaterThan(radioHoja(10));
    expect(radioHoja(500)).toBe(radioHoja(100));
  });

  it('calcula la profundidad en niveles', () => {
    expect(profundidadRaiz('bachillerato', 'maestria')).toBe(5);
    expect(profundidadRaiz('maestria', 'maestria')).toBe(0);
    expect(profundidadRaiz('doctorado', 'profesional')).toBe(0);
  });

  it('funciona con un árbol vacío', () => {
    const vacio = calcularArbol({
      nivelPerfil: 'bachillerato',
      materias: [],
      temas: [],
      conceptos: [],
    });
    expect(vacio.hojas).toEqual([]);
    expect(vacio.raices).toEqual([]);
  });

  it('es determinista', () => {
    expect(calcularArbol(entrada)).toEqual(calcularArbol(entrada));
  });

  it('ubica las etiquetas de raíces vecinas sin que se pisen', () => {
    const raiz = (id: string, x: number, y: number): RaizArbol => ({
      id,
      nombre: 'Descomposición de vectores',
      nivelOrigen: 'bachillerato',
      x,
      y,
      profundidad: 2,
      temaIds: [],
      etiquetaArriba: false,
    });
    const raices = [raiz('a', 300, 420), raiz('b', 360, 425)];
    ubicarEtiquetas(raices, MEDIDAS);
    expect(raices[0]!.etiquetaArriba).not.toBe(raices[1]!.etiquetaArriba);
    const [c1, c2] = raices.map((r) => cajaEtiqueta(r, r.etiquetaArriba));
    const seCruzan = c1!.x1 < c2!.x2 && c2!.x1 < c1!.x2 && c1!.y1 < c2!.y2 && c2!.y1 < c1!.y2;
    expect(seCruzan).toBe(false);
  });

  it('una raíz pegada al suelo pone la etiqueta abajo para no salirse', () => {
    const r: RaizArbol = {
      id: 'a',
      nombre: 'Despejes',
      nivelOrigen: 'bachillerato',
      x: 320,
      y: MEDIDAS.suelo + 30,
      profundidad: 2,
      temaIds: [],
      etiquetaArriba: true,
    };
    ubicarEtiquetas([r], MEDIDAS);
    expect(r.etiquetaArriba).toBe(false);
  });
});
