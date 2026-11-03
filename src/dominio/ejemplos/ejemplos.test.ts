import { describe, expect, it } from 'vitest';
import { enEquilibrio } from '../fuerzas';
import {
  buscarGenerador,
  GENERADORES,
  generadoresPorArea,
  normalizarValores,
  num,
  valoresIniciales,
} from './index';
import { dosCables, planoInclinado } from './mecanica';
import { busquedaBinaria, dilucion, dosisPorPeso, elasticidad, proporcion } from './otrasAreas';

describe('formato de números', () => {
  it('usa coma decimal y punto de miles', () => {
    expect(num(1234.5)).toBe('1.234,5');
    expect(num(3.2056, 2)).toBe('3,21');
    expect(num(2, 2)).toBe('2');
    expect(num(-0.5)).toBe('−0,5');
  });
});

describe('ejemplos que se resuelven solos', () => {
  it('todos se comprueban con sus valores por defecto y tienen pasos con palabras', () => {
    for (const g of GENERADORES) {
      const s = g.resolver(valoresIniciales(g));
      expect(s.comprobado, g.id).toBe(true);
      expect(s.pasos.length, g.id).toBeGreaterThan(1);
      for (const p of s.pasos) expect(p.descripcion.length, g.id).toBeGreaterThan(10);
    }
  });

  it('plano inclinado: m = 10 kg, 30°, μ = 0,2', () => {
    const s = planoInclinado.resolver({ m: 10, theta: 30, mu: 0.2, g: 9.81 });
    const [W, N, f] = s.diagrama!.fuerzas;
    expect(W!.magnitud).toBeCloseTo(98.1);
    expect(N!.magnitud).toBeCloseTo(84.96, 2);
    expect(f!.magnitud).toBeCloseTo(16.99, 2);
    expect(s.pasos.at(-1)!.valor).toBe('a = 3,21 m/s² plano abajo');
    expect(s.comprobado).toBe(true);
  });

  it('plano inclinado: si la fricción alcanza, no desliza y queda en equilibrio', () => {
    const s = planoInclinado.resolver({ m: 5, theta: 10, mu: 0.5, g: 9.81 });
    expect(s.pasos.at(-1)!.valor).toBe('a = 0 m/s²');
    expect(enEquilibrio(s.diagrama!.fuerzas)).toBe(true);
  });

  it('dos cables simétricos a 45° cargan lo mismo: W / √2', () => {
    const s = dosCables.resolver({ W: 100, alfa: 45, beta: 45 });
    const [T1, T2] = s.diagrama!.fuerzas;
    expect(T1!.magnitud).toBeCloseTo(70.71, 2);
    expect(T2!.magnitud).toBeCloseTo(70.71, 2);
    expect(enEquilibrio(s.diagrama!.fuerzas)).toBe(true);
  });

  it('dos cables: el más empinado carga más', () => {
    const s = dosCables.resolver({ W: 500, alfa: 30, beta: 60 });
    const [T1, T2] = s.diagrama!.fuerzas;
    expect(T1!.magnitud).toBeCloseTo(250, 6);
    expect(T2!.magnitud).toBeCloseTo(433.01, 2);
  });

  it('dilución: avisa si se pide una concentración mayor', () => {
    expect(dilucion.resolver({ C1: 2, C2: 0.5, V2: 250 }).pasos[1]!.valor).toBe('V1 = 62,5 mL');
    const mal = dilucion.resolver({ C1: 1, C2: 2, V2: 100 });
    expect(mal.aviso).toBeDefined();
    expect(mal.comprobado).toBe(false);
  });

  it('dosis: 18 kg a 15 mg/kg con 32 mg/mL', () => {
    const s = dosisPorPeso.resolver({ peso: 18, dosis: 15, conc: 32 });
    expect(s.pasos[0]!.valor).toBe('270 mg');
    expect(s.pasos[1]!.valor).toBe('8,44 mL');
  });

  it('elasticidad por punto medio y su interpretación', () => {
    const s = elasticidad.resolver({ P1: 2000, P2: 2500, Q1: 1200, Q2: 900 });
    // %ΔQ = −300/1050 = −28,57 %; %ΔP = 500/2250 = 22,22 %; E = −1,29
    expect(s.pasos[3]!.valor).toBe('E = −1,29, |E| = 1,29');
    expect(s.comprobacion).toMatch(/elástica/);
    expect(elasticidad.resolver({ P1: 10, P2: 10, Q1: 5, Q2: 4 }).aviso).toBeDefined();
  });

  it('proporción: 1920 × 1080 a 1200 de ancho', () => {
    const s = proporcion.resolver({ ancho: 1920, alto: 1080, nuevo: 1200 });
    expect(s.pasos[0]!.valor).toBe('Relación 16:9');
    expect(s.pasos[1]!.valor).toBe('675 px (redondeado: 675 px)');
  });

  it('búsqueda binaria: encuentra y no encuentra, sin pasar de log2(n + 1) comparaciones', () => {
    const si = busquedaBinaria.resolver({ n: 15, objetivo: 33 });
    expect(si.pasos.at(-1)!.valor).toBe('Encontrado en la posición 10');
    expect(si.comprobado).toBe(true);
    const no = busquedaBinaria.resolver({ n: 15, objetivo: 34 });
    expect(no.pasos.at(-1)!.valor).toBe('No encontrado (devuelve −1)');
    expect(no.comprobado).toBe(true);
  });

  it('acota los datos al rango permitido', () => {
    const v = normalizarValores(busquedaBinaria, { n: 200.4, objetivo: 3.6 });
    expect(v).toEqual({ n: 63, objetivo: 4 });
  });

  it('ordena por área y busca por id', () => {
    const { propios, otros } = generadoresPorArea('ingenieria');
    expect(propios.map((g) => g.id)).toEqual(['g-plano-inclinado', 'g-dos-cables']);
    expect(propios.length + otros.length).toBe(GENERADORES.length);
    expect(buscarGenerador('g-dilucion')).toBe(dilucion);
  });
});
