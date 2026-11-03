import { describe, expect, it } from 'vitest';
import type { ConceptoRaiz, ErrorRegistrado } from '@/db/esquemas';
import type { Nivel } from './catalogo';
import { minutosRepasoBase, pesoError, puntuarRaices, temasQueFallan } from './raices';

const ahora = new Date('2026-11-03T12:00:00');
const haceDias = (d: number) => new Date(ahora.getTime() - d * 86_400_000).toISOString();

function concepto(id: string, nivelOrigen: Nivel = 'bachillerato'): ConceptoRaiz {
  return { id, nombre: id, descripcion: '', nivelOrigen, temaIds: [] };
}

let n = 0;
function error(
  materiaId: string,
  conceptoIds: string[],
  dias = 0,
  resuelto = false,
): ErrorRegistrado {
  return {
    id: `e${n++}`,
    materiaId,
    temaId: `t-${materiaId}`,
    tipo: 'procedimiento',
    enunciado: '',
    miRespuesta: '',
    solucionCorrecta: '',
    conceptoIds,
    fecha: haceDias(dias),
    resuelto,
  };
}

const niveles = new Map<string, Nivel>([
  ['calculo', 'profesional'],
  ['fisica', 'profesional'],
  ['quimica', 'tecnologo'],
  ['econometria', 'maestria'],
  ['matematicas', 'bachillerato'],
]);

describe('peso de un error', () => {
  it('un error de hoy sin resolver pesa 1', () => {
    expect(pesoError(error('calculo', []), ahora)).toBe(1);
  });
  it('pierde la mitad del peso en la vida media', () => {
    expect(pesoError(error('calculo', [], 21), ahora)).toBeCloseTo(0.5);
  });
  it('un error resuelto pesa menos', () => {
    expect(pesoError(error('calculo', [], 0, true), ahora)).toBeCloseTo(0.3);
  });
});

describe('ranking de raíces compartidas', () => {
  it('ordena por puntaje y cruza materias', () => {
    const despejes = concepto('despejes');
    const derivadas = concepto('derivadas', 'profesional');
    const lectura = concepto('lectura');
    const ranking = puntuarRaices({
      conceptos: [despejes, derivadas, lectura],
      errores: [
        error('calculo', ['despejes']),
        error('fisica', ['despejes']),
        error('quimica', ['despejes'], 10),
        error('calculo', ['derivadas'], 2),
        error('calculo', ['lectura'], 60, true),
      ],
      nivelPorMateria: niveles,
      ahora,
    });
    expect(ranking.map((r) => r.concepto.id)).toEqual(['despejes', 'derivadas', 'lectura']);
    expect(ranking[0]).toMatchObject({
      errores: 3,
      noResueltos: 3,
      materiaIds: ['calculo', 'fisica', 'quimica'],
    });
    expect(ranking[0]!.nivelesAfectados.sort()).toEqual(['profesional', 'tecnologo']);
  });

  it('los recientes pesan más que los viejos', () => {
    const r = puntuarRaices({
      conceptos: [concepto('a'), concepto('b')],
      errores: [error('calculo', ['a'], 1), error('calculo', ['b'], 40)],
      nivelPorMateria: niveles,
      ahora,
    });
    expect(r[0]!.concepto.id).toBe('a');
  });

  it('los no resueltos pesan más que los resueltos', () => {
    const r = puntuarRaices({
      conceptos: [concepto('a'), concepto('b')],
      errores: [error('calculo', ['a'], 0, true), error('calculo', ['b'], 5)],
      nivelPorMateria: niveles,
      ahora,
    });
    expect(r[0]!.concepto.id).toBe('b');
  });

  it('omite raíces sin errores', () => {
    expect(
      puntuarRaices({ conceptos: [concepto('x')], errores: [], nivelPorMateria: niveles, ahora }),
    ).toEqual([]);
  });
});

describe('base pendiente de un nivel anterior', () => {
  it('maestría con raíz de pregrado o bachillerato', () => {
    const r = puntuarRaices({
      conceptos: [
        concepto('algebra', 'bachillerato'),
        concepto('regresion', 'profesional'),
        concepto('causalidad', 'maestria'),
      ],
      errores: [
        error('econometria', ['algebra']),
        error('econometria', ['regresion']),
        error('econometria', ['causalidad']),
      ],
      nivelPorMateria: niveles,
      ahora,
    });
    const porId = Object.fromEntries(r.map((x) => [x.concepto.id, x.basePendiente]));
    expect(porId).toEqual({ algebra: true, regresion: true, causalidad: false });
  });

  it('en bachillerato una raíz de bachillerato no es de un nivel anterior', () => {
    const [r] = puntuarRaices({
      conceptos: [concepto('fracciones')],
      errores: [error('matematicas', ['fracciones'])],
      nivelPorMateria: niveles,
      ahora,
    });
    expect(r!.basePendiente).toBe(false);
  });

  it('tecnólogo con raíz de bachillerato', () => {
    const [r] = puntuarRaices({
      conceptos: [concepto('estequiometria')],
      errores: [error('quimica', ['estequiometria'])],
      nivelPorMateria: niveles,
      ahora,
    });
    expect(r!.basePendiente).toBe(true);
  });

  it('si los errores ya están resueltos no la marca como pendiente', () => {
    const [r] = puntuarRaices({
      conceptos: [concepto('algebra')],
      errores: [error('econometria', ['algebra'], 0, true)],
      nivelPorMateria: niveles,
      ahora,
    });
    expect(r!.basePendiente).toBe(false);
  });

  it('propone un repaso corto que crece con los errores y las materias, con tope', () => {
    expect(minutosRepasoBase({ noResueltos: 1, materiaIds: ['a'] })).toBe(15);
    expect(minutosRepasoBase({ noResueltos: 3, materiaIds: ['a', 'b'] })).toBe(30);
    expect(minutosRepasoBase({ noResueltos: 20, materiaIds: ['a', 'b', 'c'] })).toBe(45);
  });
});

describe('temas que fallan', () => {
  it('solo cuenta errores recientes sin resolver', () => {
    const t = temasQueFallan(
      [error('calculo', [], 3), error('fisica', [], 30), error('quimica', [], 1, true)],
      ahora,
    );
    expect([...t]).toEqual(['t-calculo']);
  });
});
