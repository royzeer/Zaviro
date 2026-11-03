import { describe, expect, it } from 'vitest';
import type { Materia } from '@/db/esquemas';
import { reglasSugeridas } from './niveles';
import { categoriaDeNota } from './niveles';
import {
  estadoNota,
  necesarioPara,
  necesarioParaPromedio,
  notaDeMateria,
  promedio,
  redondearArriba,
  resumenPromedio,
} from './notas';

const escala05 = { minimo: 0, maximo: 5, aprobatoria: 3, decimales: 1 };

function materia(id: string, extra: Partial<Materia>): Materia {
  return { id, perfilId: 'p', nombre: id, color: '#8b6f52', tipo: 'teorica', cortes: [], ...extra };
}

describe('estado de la nota', () => {
  it('calcula lo acumulado y el promedio de lo evaluado', () => {
    const e = estadoNota([{ peso: 30, nota: 4 }, { peso: 30, nota: 3 }, { peso: 40 }]);
    expect(e.acumulado).toBeCloseTo(2.1);
    expect(e.promedioEvaluado).toBeCloseTo(3.5);
    expect(e.pesoRestante).toBe(40);
    expect(e.final).toBeNull();
  });

  it('normaliza si los pesos no suman 100', () => {
    expect(
      estadoNota([
        { peso: 1, nota: 4 },
        { peso: 1, nota: 2 },
      ]).final,
    ).toBe(3);
  });
});

describe('cuánto necesito (profesional, cortes 30-30-40)', () => {
  it('caso posible', () => {
    // 0,3·3,0 + 0,3·2,5 = 1,65; faltan 1,35 en el 40 % → 3,375 → 3,4
    const r = necesarioPara(
      3,
      [{ peso: 30, nota: 3 }, { peso: 30, nota: 2.5 }, { peso: 40 }],
      escala05,
    );
    expect(r).toEqual({ veredicto: 'posible', nota: 3.4 });
  });

  it('caso imposible', () => {
    const r = necesarioPara(
      3,
      [{ peso: 30, nota: 1 }, { peso: 30, nota: 1 }, { peso: 40 }],
      escala05,
    );
    expect(r.veredicto).toBe('imposible');
    expect(r.nota).toBeGreaterThan(5);
  });

  it('caso asegurado', () => {
    const r = necesarioPara(
      3,
      [{ peso: 30, nota: 5 }, { peso: 30, nota: 5 }, { peso: 40 }],
      escala05,
    );
    expect(r.veredicto).toBe('asegurado');
  });

  it('meta propia más alta que la aprobatoria', () => {
    // 0,6·4,2 = 2,52; faltan 1,98 en el 40 % → 4,95 → 5,0
    const r = necesarioPara(
      4.5,
      [{ peso: 30, nota: 4.2 }, { peso: 30, nota: 4.2 }, { peso: 40 }],
      escala05,
    );
    expect(r).toEqual({ veredicto: 'posible', nota: 5 });
    expect(
      necesarioPara(4.5, [{ peso: 30, nota: 4 }, { peso: 30, nota: 4 }, { peso: 40 }], escala05)
        .veredicto,
    ).toBe('imposible');
  });

  it('cuando todo está evaluado dice si se logró', () => {
    expect(
      necesarioPara(
        3,
        [
          { peso: 50, nota: 3 },
          { peso: 50, nota: 2.9 },
        ],
        escala05,
      ).veredicto,
    ).toBe('logrado');
    expect(
      necesarioPara(
        3,
        [
          { peso: 50, nota: 3 },
          { peso: 50, nota: 2.8 },
        ],
        escala05,
      ).veredicto,
    ).toBe('no-logrado');
  });

  it('redondea hacia arriba con los decimales de la escala', () => {
    expect(redondearArriba(3.31, 1)).toBe(3.4);
    expect(redondearArriba(3.3, 1)).toBe(3.3);
    expect(redondearArriba(3.301, 2)).toBe(3.31);
  });
});

describe('cuánto necesito en cada nivel', () => {
  it('bachillerato: escala 1 a 5, cuatro períodos y la categoría del colegio', () => {
    const r = reglasSugeridas('bachillerato');
    const cortes = r.evaluacion.componentes.map((c, i) => ({
      peso: c.peso,
      ...(i < 3 ? { nota: 2.8 } : {}),
    }));
    // 0,25·2,8·3 = 2,1; faltan 0,9 en 25 % → 3,6
    expect(necesarioPara(r.escala.aprobatoria, cortes, r.escala)).toEqual({
      veredicto: 'posible',
      nota: 3.6,
    });
    r.categoriasDesempeno = [
      { nombre: 'Superior', desde: 4.6, hasta: 5 },
      { nombre: 'Alto', desde: 4, hasta: 4.5 },
      { nombre: 'Básico', desde: 3, hasta: 3.9 },
      { nombre: 'Bajo', desde: 1, hasta: 2.9 },
    ];
    expect(categoriaDeNota(2.8, r)).toBe('Bajo');
  });

  it('en bachillerato, aunque saque 1,0 (el mínimo) puede quedar asegurado', () => {
    const r = reglasSugeridas('bachillerato');
    const cortes = [
      { peso: 25, nota: 5 },
      { peso: 25, nota: 5 },
      { peso: 25, nota: 4 },
      { peso: 25 },
    ];
    expect(necesarioPara(3, cortes, r.escala).veredicto).toBe('asegurado');
  });

  it('tecnólogo: evidencias con pesos propios', () => {
    const r = reglasSugeridas('tecnologo');
    const cortes = r.evaluacion.componentes.map((c, i) => ({
      peso: c.peso,
      ...(i === 0 ? { nota: 2 } : {}),
    }));
    // 0,3·2 = 0,6; faltan 2,4 en 70 % → 3,43 → 3,5
    expect(necesarioPara(3, cortes, r.escala)).toEqual({ veredicto: 'posible', nota: 3.5 });
  });

  it('maestría: la nota mínima por materia es 3,5', () => {
    const r = reglasSugeridas('maestria');
    const cortes = [{ peso: 30, nota: 3.5 }, { peso: 30, nota: 3.5 }, { peso: 40 }];
    expect(necesarioPara(r.promedio.notaMinimaMateria, cortes, r.escala)).toEqual({
      veredicto: 'posible',
      nota: 3.5,
    });
  });

  it('respeta una escala editada (0 a 100, aprobatoria 60)', () => {
    const escala = { minimo: 0, maximo: 100, aprobatoria: 60, decimales: 0 };
    expect(necesarioPara(60, [{ peso: 50, nota: 50 }, { peso: 50 }], escala)).toEqual({
      veredicto: 'posible',
      nota: 70,
    });
  });
});

describe('promedios', () => {
  it('ponderado por créditos frente a simple', () => {
    const items = [
      { nota: 4, creditos: 4 },
      { nota: 3, creditos: 2 },
    ];
    expect(promedio(items, true)).toBeCloseTo(11 / 3);
    expect(promedio(items, false)).toBe(3.5);
    expect(promedio([], true)).toBeNull();
  });

  it('usa la nota final registrada o la calculada', () => {
    expect(notaDeMateria(materia('a', { notaFinal: 4.2 }))).toBe(4.2);
    expect(notaDeMateria(materia('b', { cortes: [{ nombre: 'x', peso: 100, nota: 3.3 }] }))).toBe(
      3.3,
    );
    expect(notaDeMateria(materia('c', { cortes: [{ nombre: 'x', peso: 100 }] }))).toBeNull();
  });

  const reglas = reglasSugeridas('profesional');
  const materias = [
    materia('calculo', {
      creditos: 4,
      estado: 'aprobada',
      notaFinal: 4,
      periodoAcademico: '2025-2',
    }),
    materia('algebra', {
      creditos: 3,
      estado: 'aprobada',
      notaFinal: 3,
      periodoAcademico: '2025-2',
    }),
    materia('fisica', {
      creditos: 4,
      estado: 'cursando',
      periodoAcademico: '2026-1',
      cortes: [
        { nombre: 'c1', peso: 30, nota: 3.5 },
        { nombre: 'c2', peso: 70 },
      ],
    }),
    materia('optativa', { creditos: 2, estado: 'pendiente' }),
  ];

  it('semestral, acumulado y proyectado (profesional)', () => {
    const r = resumenPromedio(materias, reglas, '2025-2');
    expect(r.semestral).toBeCloseTo((16 + 9) / 7);
    expect(r.acumulado).toBeCloseTo(25 / 7);
    expect(r.proyectado).toBeCloseTo((16 + 9 + 14) / 11);
    expect(r.creditosCalificados).toBe(7);
  });

  it('cuánto necesito en lo que curso para mantener el promedio mínimo', () => {
    // (3,6·11 − 25) / 4 = 3,65 → 3,7
    expect(necesarioParaPromedio(materias, reglas, 3.6)).toEqual({
      veredicto: 'posible',
      nota: 3.7,
    });
    expect(necesarioParaPromedio(materias, reglas, 2).veredicto).toBe('asegurado');
    expect(necesarioParaPromedio(materias, reglas, 4.9).veredicto).toBe('imposible');
  });

  it('especialización: promedio acumulado mínimo 3,5 sin margen', () => {
    const r = reglasSugeridas('especializacion');
    const m = [
      materia('a', { creditos: 2, estado: 'aprobada', notaFinal: 3.5 }),
      materia('b', { creditos: 2, estado: 'cursando' }),
    ];
    expect(necesarioParaPromedio(m, r, r.promedio.promedioAcumuladoMinimo!)).toEqual({
      veredicto: 'posible',
      nota: 3.5,
    });
  });

  it('sin créditos (bachillerato) promedia materias por igual', () => {
    const r = reglasSugeridas('bachillerato');
    const m = [
      materia('a', { notaFinal: 4, estado: 'aprobada' }),
      materia('b', { notaFinal: 3, estado: 'aprobada' }),
    ];
    expect(resumenPromedio(m, r).acumulado).toBe(3.5);
  });
});
