import { describe, expect, it } from 'vitest';
import type { Materia, Tema } from '@/db/esquemas';
import { CONFIG_PLAN, capacidadEntre, generarPlan } from './plan';
import type { RendimientoTema } from './rendimiento';

const hoy = new Date('2026-11-03T08:00:00');
const en = (d: number) => new Date(hoy.getTime() + d * 86_400_000).toISOString();

function item(
  id: string,
  materiaId: string,
  puntosPorHora: number,
  horasPendientes: number,
  examenEnDias?: number,
): RendimientoTema {
  const materia: Materia = {
    id: materiaId,
    perfilId: 'p',
    nombre: materiaId,
    color: '#8b6f52',
    tipo: 'teorica',
    cortes: [],
    ...(examenEnDias !== undefined ? { fechaParcial: en(examenEnDias) } : {}),
  };
  const tema: Tema = { id, materiaId, titulo: id, pesoParcial: 50, dominio: 0 };
  return { tema, materia, horas: horasPendientes, horasPendientes, puntosPorHora };
}

const horasDe = (plan: ReturnType<typeof generarPlan>, temaId: string) =>
  plan.dias
    .flatMap((d) => d.bloques)
    .filter((b) => b.temaId === temaId)
    .reduce((s, b) => s + b.horas, 0);

describe('plan de estudio', () => {
  it('no avisa que faltan horas por restos de minutos que no alcanzan a ser un bloque', () => {
    const plan = generarPlan({
      rendimiento: [item('a', 'm1', 3, 10.1, 30), item('b', 'm1', 3, 7.2, 30)],
      hoy,
    });
    expect(plan.faltantes).toEqual([]);
  });

  it('empieza por el tema de mayor rendimiento', () => {
    const plan = generarPlan({
      rendimiento: [item('bajo', 'm1', 2, 3, 5), item('alto', 'm1', 8, 3, 5)],
      hoy,
      config: { horasPorDia: 1 },
    });
    expect(plan.dias[0]!.bloques[0]!.temaId).toBe('alto');
  });

  it('sube una materia apretada aunque rinda menos por hora', () => {
    // m1 rinde más pero su examen es en 14 días con poco por estudiar;
    // m2 tiene 9 h pendientes y solo 10 h disponibles antes de su examen.
    const plan = generarPlan({
      rendimiento: [item('holgado', 'm1', 3, 4, 14), item('apretado', 'm2', 2, 9, 5)],
      hoy,
      config: { horasPorDia: 2 },
    });
    expect(plan.dias[0]!.bloques[0]!.temaId).toBe('apretado');
    expect(horasDe(plan, 'apretado')).toBeCloseTo(9);
    expect(plan.faltantes).toEqual([]);
  });

  it('calcula las horas disponibles antes de un examen sin contar días libres', () => {
    const lunes = new Date('2026-11-02T00:00:00');
    const domingo = new Date('2026-11-08T00:00:00');
    expect(capacidadEntre(lunes, domingo, { ...CONFIG_PLAN, horasPorDia: 2 })).toBe(12);
    expect(
      capacidadEntre(lunes, domingo, { ...CONFIG_PLAN, horasPorDia: 2, diasLibres: [6] }),
    ).toBe(10);
  });

  it('no se pasa de las horas disponibles por día', () => {
    const plan = generarPlan({
      rendimiento: [item('a', 'm1', 5, 10, 5), item('b', 'm2', 4, 10, 5)],
      hoy,
      config: { horasPorDia: 2 },
    });
    for (const d of plan.dias)
      expect(d.bloques.reduce((s, b) => s + b.horas, 0)).toBeLessThanOrEqual(2);
  });

  it('no planea un tema después de su examen', () => {
    const plan = generarPlan({
      rendimiento: [item('a', 'm1', 5, 20, 2), item('b', 'm2', 1, 2, 6)],
      hoy,
      config: { horasPorDia: 3 },
    });
    const dias = plan.dias
      .filter((d) => d.bloques.some((b) => b.temaId === 'a'))
      .map((d) => d.fecha);
    expect(dias.every((f) => f < '2026-11-05')).toBe(true);
    expect(plan.faltantes).toEqual([{ materiaId: 'm1', horas: 16 }]);
  });

  it('reserva primero el tiempo de los repasos, incluidos los atrasados', () => {
    const repasosPorDia = new Map([
      ['2026-11-01', 10],
      ['2026-11-03', 10],
    ]);
    const plan = generarPlan({
      rendimiento: [item('a', 'm1', 5, 10, 5)],
      hoy,
      repasosPorDia,
      config: { horasPorDia: 2 },
    });
    expect(plan.dias[0]!.minutosRepaso).toBe(30);
    expect(horasDe({ dias: [plan.dias[0]!], faltantes: [] }, 'a')).toBe(1.5);
  });

  it('respeta los días libres', () => {
    // 2026-11-08 es domingo.
    const plan = generarPlan({
      rendimiento: [item('a', 'm1', 5, 30, 10)],
      hoy,
      config: { horasPorDia: 2, diasLibres: [0] },
    });
    const domingo = plan.dias.find((d) => d.fecha === '2026-11-08')!;
    expect(domingo.libre).toBe(true);
    expect(domingo.bloques).toEqual([]);
  });

  it('lo hecho hoy ocupa la capacidad de hoy y se marca como hecho', () => {
    const plan = generarPlan({
      rendimiento: [item('a', 'm1', 5, 6, 10), item('b', 'm1', 4, 6, 10)],
      horasEstudiadas: new Map([['a', 1.5]]),
      hechoHoy: new Map([['a', 1.5]]),
      hoy,
      config: { horasPorDia: 2 },
    });
    const bloques = plan.dias[0]!.bloques;
    expect(bloques[0]).toMatchObject({ temaId: 'a', horas: 1.5, hecho: true });
    expect(bloques.filter((b) => !b.hecho).reduce((s, b) => s + b.horas, 0)).toBeCloseTo(0.5);
  });

  it('descuenta lo ya estudiado', () => {
    const plan = generarPlan({
      rendimiento: [item('a', 'm1', 5, 3, 5)],
      hoy,
      horasEstudiadas: new Map([['a', 2]]),
    });
    expect(horasDe(plan, 'a')).toBe(1);
  });

  it('se reajusta si te atrasas: con menos días quedan más horas por cubrir', () => {
    const r = [item('a', 'm1', 5, 8, 4)];
    const aTiempo = generarPlan({
      rendimiento: r,
      hoy,
      config: { horasPorDia: 2, maximoPorTemaDia: 2 },
    });
    const tarde = generarPlan({
      rendimiento: r,
      hoy: new Date(hoy.getTime() + 2 * 86_400_000),
      config: { horasPorDia: 2, maximoPorTemaDia: 2 },
    });
    expect(aTiempo.faltantes).toEqual([]);
    expect(tarde.faltantes).toEqual([{ materiaId: 'm1', horas: 4 }]);
  });

  it('marca los días de examen y sin fechas planea una semana', () => {
    const conFecha = generarPlan({ rendimiento: [item('a', 'm1', 5, 1, 3)], hoy });
    expect(conFecha.dias).toHaveLength(4);
    expect(conFecha.dias.at(-1)).toMatchObject({
      fecha: '2026-11-06',
      examenes: ['m1'],
      bloques: [],
    });
    const sinFecha = generarPlan({ rendimiento: [item('a', 'm1', 5, 1)], hoy });
    expect(sinFecha.dias).toHaveLength(7);
  });
});
