import { describe, expect, it } from 'vitest';
import type { TarjetaRepaso } from '@/db/esquemas';
import { NIVELES } from './catalogo';
import { reglasSugeridas } from './niveles';
import { calificarTarjeta, nuevaFacilidad, sm2, tarjetasVencidas, textoIntervalo } from './repaso';

const nueva = { facilidad: 2.5, intervalo: 0, repeticiones: 0 };

describe('SM-2', () => {
  it('ajusta la facilidad según la fórmula de SM-2', () => {
    expect(nuevaFacilidad(2.5, 5)).toBeCloseTo(2.6);
    expect(nuevaFacilidad(2.5, 4)).toBeCloseTo(2.5);
    expect(nuevaFacilidad(2.5, 3)).toBeCloseTo(2.36);
    expect(nuevaFacilidad(1.3, 1)).toBe(1.3);
  });

  it('usa los intervalos iniciales del perfil y luego multiplica por la facilidad', () => {
    const iniciales = [1, 6];
    const a = sm2(nueva, 'bien', iniciales);
    expect(a).toEqual({ facilidad: 2.5, repeticiones: 1, intervalo: 1 });
    const b = sm2(a, 'bien', iniciales);
    expect(b.intervalo).toBe(6);
    const c = sm2(b, 'bien', iniciales);
    expect(c.intervalo).toBe(15);
    expect(c.repeticiones).toBe(3);
  });

  it('olvidar reinicia las repeticiones y baja la facilidad', () => {
    const r = sm2({ facilidad: 2.5, intervalo: 15, repeticiones: 3 }, 'olvide', [1, 6]);
    expect(r.repeticiones).toBe(0);
    expect(r.intervalo).toBe(0);
    expect(r.facilidad).toBeLessThan(2.5);
  });

  it('fácil da más días que bien y bien más que difícil', () => {
    const estado = { facilidad: 2.5, intervalo: 6, repeticiones: 2 };
    const i = (c: 'dificil' | 'bien' | 'facil') => sm2(estado, c, [1, 6]).intervalo;
    expect(i('facil')).toBeGreaterThan(i('bien'));
    expect(i('bien')).toBeGreaterThan(i('dificil'));
    expect(i('dificil')).toBeGreaterThan(6);
  });

  it.each(NIVELES)('respeta el primer intervalo sugerido para %s', (nivel) => {
    const reglas = reglasSugeridas(nivel);
    expect(sm2(nueva, 'bien', reglas.repaso.intervalosIniciales).intervalo).toBe(
      reglas.repaso.intervalosIniciales[0],
    );
  });

  it('bachillerato repasa antes que maestría', () => {
    const dosVeces = (nivel: 'bachillerato' | 'maestria') => {
      const iniciales = reglasSugeridas(nivel).repaso.intervalosIniciales;
      return sm2(sm2(nueva, 'bien', iniciales), 'bien', iniciales).intervalo;
    };
    expect(dosVeces('bachillerato')).toBeLessThan(dosVeces('maestria'));
  });
});

describe('calificar una tarjeta', () => {
  const tarjeta: TarjetaRepaso = {
    id: 't',
    origenTipo: 'error',
    origenId: 'e',
    frente: 'f',
    reverso: 'r',
    facilidad: 2.5,
    intervalo: 0,
    repeticiones: 0,
    proximoRepaso: '2026-11-03T12:00:00.000Z',
  };
  const ahora = new Date('2026-11-03T12:00:00.000Z');

  it('programa el próximo repaso según las reglas', () => {
    const r = calificarTarjeta(tarjeta, 'bien', { repaso: { intervalosIniciales: [2, 5] } }, ahora);
    expect(r.proximoRepaso).toBe('2026-11-05T12:00:00.000Z');
  });

  it('si se olvida, vuelve en 10 minutos', () => {
    const r = calificarTarjeta(tarjeta, 'olvide', { repaso: { intervalosIniciales: [1] } }, ahora);
    expect(r.proximoRepaso).toBe('2026-11-03T12:10:00.000Z');
  });
});

describe('utilidades de repaso', () => {
  it('describe intervalos', () => {
    expect(textoIntervalo(0)).toBe('10 min');
    expect(textoIntervalo(0.5)).toBe('12 h');
    expect(textoIntervalo(4)).toBe('4 d');
    expect(textoIntervalo(60)).toBe('2 meses');
  });

  it('filtra y ordena las tarjetas vencidas', () => {
    const ahora = new Date('2026-11-03T12:00:00.000Z');
    const v = tarjetasVencidas(
      [
        { proximoRepaso: '2026-11-04T00:00:00.000Z' },
        { proximoRepaso: '2026-11-03T08:00:00.000Z' },
        { proximoRepaso: '2026-11-01T00:00:00.000Z' },
      ],
      ahora,
    );
    expect(v.map((x) => x.proximoRepaso)).toEqual([
      '2026-11-01T00:00:00.000Z',
      '2026-11-03T08:00:00.000Z',
    ]);
  });
});
