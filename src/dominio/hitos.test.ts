import { describe, expect, it } from 'vitest';
import { calendarioPorMes, hitosSugeridos, resumenHitos, type HitoBasico } from './hitos';

const hoy = new Date('2026-11-03T10:00:00');
const h = (id: string, estado: HitoBasico['estado'], fecha?: string): HitoBasico => ({
  id,
  titulo: id,
  estado,
  ...(fecha ? { fecha: `${fecha}T12:00:00.000Z` } : {}),
});

describe('hitos', () => {
  it('sugiere los hitos del trabajo de grado en maestría y de investigación en doctorado', () => {
    expect(hitosSugeridos('maestria')).toEqual([
      'Propuesta',
      'Marco teórico',
      'Metodología',
      'Avances',
      'Sustentación',
    ]);
    expect(hitosSugeridos('especializacion')).toContain('Sustentación');
    expect(hitosSugeridos('doctorado')).toContain('Examen de candidatura');
  });

  it('calcula progreso, próximo hito y atrasados', () => {
    const r = resumenHitos(
      [
        h('propuesta', 'aprobado', '2026-08-01'),
        h('marco', 'entregado', '2026-10-01'),
        h('metodologia', 'enCurso', '2026-10-20'),
        h('avances', 'pendiente', '2026-12-01'),
        h('sustentacion', 'pendiente'),
      ],
      hoy,
    );
    expect(r.total).toBe(5);
    expect(r.cumplidos).toBe(2);
    expect(r.progreso).toBeCloseTo(1.5 / 5);
    expect(r.atrasados.map((x) => x.id)).toEqual(['metodologia']);
    expect(r.proximo?.id).toBe('avances');
    expect(r.proximo?.dias).toBe(28);
  });

  it('un hito para hoy es el próximo, no un atrasado', () => {
    const r = resumenHitos([h('hoy', 'pendiente', '2026-11-03')], hoy);
    expect(r.proximo?.dias).toBe(0);
    expect(r.atrasados).toEqual([]);
  });

  it('sin hitos el progreso es cero', () => {
    expect(resumenHitos([], hoy)).toMatchObject({ total: 0, progreso: 0, atrasados: [] });
  });

  it('agrupa el calendario por mes y deja al final lo que no tiene fecha', () => {
    const cal = calendarioPorMes([
      h('c', 'pendiente', '2026-12-05'),
      h('sin', 'pendiente'),
      h('a', 'pendiente', '2026-11-10'),
      h('b', 'pendiente', '2026-11-20'),
    ]);
    expect(cal.map((m) => m.mes)).toEqual(['2026-11', '2026-12', null]);
    expect(cal[0]!.items.map((i) => i.id)).toEqual(['a', 'b']);
  });
});
