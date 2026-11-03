import { describe, expect, it } from 'vitest';
import { resumenSaberPro } from './saberPro';

const modulos = [
  { id: 'lc', nombre: 'Lectura crítica', tipo: 'generico' as const },
  { id: 'rc', nombre: 'Razonamiento cuantitativo', tipo: 'generico' as const },
  { id: 'es', nombre: 'Diseño de software', tipo: 'especifico' as const },
];

describe('Saber Pro / TyT', () => {
  it('calcula el porcentaje con las últimas prácticas, sumando aciertos y preguntas', () => {
    const r = resumenSaberPro(
      modulos,
      [
        { moduloId: 'lc', fecha: '2026-01-01', aciertos: 0, preguntas: 10 },
        { moduloId: 'lc', fecha: '2026-02-01', aciertos: 6, preguntas: 10 },
        { moduloId: 'lc', fecha: '2026-03-01', aciertos: 14, preguntas: 20 },
        { moduloId: 'lc', fecha: '2026-04-01', aciertos: 8, preguntas: 10 },
      ],
      3,
    );
    const lc = r.find((x) => x.modulo.id === 'lc')!;
    expect(lc.practicas).toBe(4);
    expect(lc.porcentaje).toBeCloseTo((28 / 40) * 100);
    expect(lc.tendencia).toBeCloseTo(20);
    expect(lc.ultima).toBe('2026-04-01');
  });

  it('pone primero los módulos sin práctica y luego el de menor porcentaje', () => {
    const r = resumenSaberPro(modulos, [
      { moduloId: 'lc', fecha: '2026-01-01', aciertos: 8, preguntas: 10 },
      { moduloId: 'rc', fecha: '2026-01-01', aciertos: 4, preguntas: 10 },
    ]);
    expect(r.map((x) => x.modulo.id)).toEqual(['es', 'rc', 'lc']);
    expect(r[0]!.porcentaje).toBeNull();
  });

  it('en empate pone primero el que viene bajando', () => {
    const r = resumenSaberPro(modulos.slice(0, 2), [
      { moduloId: 'lc', fecha: '2026-01-01', aciertos: 4, preguntas: 10 },
      { moduloId: 'lc', fecha: '2026-02-01', aciertos: 6, preguntas: 10 },
      { moduloId: 'rc', fecha: '2026-01-01', aciertos: 6, preguntas: 10 },
      { moduloId: 'rc', fecha: '2026-02-01', aciertos: 4, preguntas: 10 },
    ]);
    expect(r[0]!.modulo.id).toBe('rc');
  });
});
