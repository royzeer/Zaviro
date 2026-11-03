import { describe, expect, it } from 'vitest';
import type { Materia, Tema } from '@/db/esquemas';
import { reglasSugeridas } from './niveles';
import {
  horasEstimadas,
  horasSinCreditos,
  pesoProximoCorte,
  rendimientoDeEstudio,
} from './rendimiento';

const materia = (extra: Partial<Materia> = {}): Materia => ({
  id: 'm',
  perfilId: 'p',
  nombre: 'Cálculo',
  color: '#8b6f52',
  tipo: 'cuantitativa',
  cortes: [
    { nombre: 'C1', peso: 30, nota: 3 },
    { nombre: 'C2', peso: 30 },
    { nombre: 'C3', peso: 40 },
  ],
  creditos: 3,
  estado: 'cursando',
  ...extra,
});
const tema = (id: string, pesoParcial: number, dominio: number, materiaId = 'm'): Tema => ({
  id,
  materiaId,
  titulo: id,
  pesoParcial,
  dominio,
});

describe('horas estimadas', () => {
  it('usa los créditos: 3 créditos × 48 h × 2/3 independientes × 30 % del corte × fracción del tema', () => {
    const reglas = reglasSugeridas('profesional');
    const temas = [tema('a', 50, 0), tema('b', 50, 0)];
    // 3 × 48 × (2/3) = 96 h; × 0,3 = 28,8; × 0,5 = 14,4
    expect(horasEstimadas(temas[0]!, materia(), temas, reglas)).toBe(14.4);
  });

  it('el próximo corte es el primero sin nota', () => {
    expect(pesoProximoCorte(materia())).toBe(30);
    expect(pesoProximoCorte(materia({ cortes: [{ nombre: 'x', peso: 100, nota: 4 }] }))).toBeNull();
  });

  it('sin créditos (bachillerato) estima por el peso del tema', () => {
    const reglas = reglasSugeridas('bachillerato');
    expect(horasEstimadas(tema('a', 50, 0), materia({ creditos: undefined }), [], reglas)).toBe(
      horasSinCreditos(50),
    );
    expect(horasSinCreditos(0)).toBe(2);
    expect(horasSinCreditos(100)).toBe(8);
  });
});

describe('rendimiento de estudio', () => {
  const reglas = reglasSugeridas('bachillerato');
  const m = materia({ creditos: undefined });

  it('aplica peso × (1 − dominio) / horas y ordena de mayor a menor', () => {
    const r = rendimientoDeEstudio(
      [tema('dominado', 40, 0.9), tema('flojo', 40, 0.1), tema('liviano', 10, 0)],
      [m],
      reglas,
    );
    expect(r.map((x) => x.tema.id)).toEqual(['flojo', 'liviano', 'dominado']);
    const flojo = r[0]!;
    expect(flojo.puntosPorHora).toBeCloseTo((40 * 0.9) / horasSinCreditos(40), 2);
    expect(flojo.horasPendientes).toBeCloseTo(horasSinCreditos(40) * 0.9, 1);
  });

  it('un tema dominado del todo no da puntos', () => {
    const [r] = rendimientoDeEstudio([tema('a', 80, 1)], [m], reglas);
    expect(r!.puntosPorHora).toBe(0);
  });

  it('omite materias ya aprobadas', () => {
    expect(
      rendimientoDeEstudio([tema('a', 80, 0)], [materia({ estado: 'aprobada' })], reglas),
    ).toEqual([]);
  });

  it('en pregrado más créditos implican más horas y menos puntos por hora para el mismo tema', () => {
    const r = reglasSugeridas('profesional');
    const t = [tema('a', 100, 0)];
    const pocos = rendimientoDeEstudio(t, [materia({ creditos: 2 })], r)[0]!;
    const muchos = rendimientoDeEstudio(t, [materia({ creditos: 5 })], r)[0]!;
    expect(muchos.horas).toBeGreaterThan(pocos.horas);
    expect(muchos.puntosPorHora).toBeLessThan(pocos.puntosPorHora);
  });
});
