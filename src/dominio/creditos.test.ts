import { describe, expect, it } from 'vitest';
import type { Materia } from '@/db/esquemas';
import { avanceCreditos, creaCiclo, prerrequisitosPendientes } from './creditos';

function m(id: string, extra: Partial<Materia> = {}): Materia {
  return { id, perfilId: 'p', nombre: id, color: '#8b6f52', tipo: 'teorica', cortes: [], ...extra };
}

describe('avance de créditos', () => {
  it('suma aprobados y en curso frente al total del programa', () => {
    const a = avanceCreditos(
      [
        m('a', { creditos: 3, estado: 'aprobada' }),
        m('b', { creditos: 4, estado: 'aprobada' }),
        m('c', { creditos: 3, estado: 'cursando' }),
        m('d', { creditos: 2 }),
        m('e', { creditos: 3, estado: 'reprobada' }),
      ],
      160,
    );
    expect(a).toMatchObject({ aprobados: 7, cursando: 5, total: 160, faltan: 153 });
    expect(a.porcentaje).toBeCloseTo(7 / 160);
  });

  it('sin total del programa no calcula porcentaje', () => {
    expect(
      avanceCreditos([m('a', { creditos: 3, estado: 'aprobada' })]).porcentaje,
    ).toBeUndefined();
  });
});

describe('prerrequisitos', () => {
  const todas = [
    m('calculo1', { estado: 'aprobada' }),
    m('fisica1', { estado: 'cursando' }),
    m('calculo2', { prerrequisitos: ['calculo1'] }),
    m('estatica', { prerrequisitos: ['calculo1', 'fisica1'] }),
    m('dinamica', { prerrequisitos: ['estatica'] }),
  ];

  it('lista solo los prerrequisitos no aprobados', () => {
    expect(prerrequisitosPendientes(todas[2]!, todas)).toEqual([]);
    expect(prerrequisitosPendientes(todas[3]!, todas).map((x) => x.id)).toEqual(['fisica1']);
  });

  it('detecta ciclos directos e indirectos', () => {
    expect(creaCiclo('calculo1', 'calculo1', todas)).toBe(true);
    expect(creaCiclo('calculo1', 'dinamica', todas)).toBe(true);
    expect(creaCiclo('dinamica', 'calculo2', todas)).toBe(false);
  });
});
