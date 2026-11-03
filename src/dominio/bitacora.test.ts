import { describe, expect, it } from 'vitest';
import { resumenBitacora } from './bitacora';

// Martes 3 de noviembre de 2026; la semana empieza el lunes 2.
const hoy = new Date('2026-11-03T18:00:00');
const f = (d: string) => new Date(`${d}T10:00:00`).toISOString();

describe('bitácora', () => {
  it('suma horas de la semana y de los últimos 30 días, y cuenta días con registro', () => {
    const r = resumenBitacora(
      [
        { fecha: f('2026-11-03'), horas: 2 },
        { fecha: f('2026-11-02'), horas: 1.5 },
        { fecha: f('2026-11-01'), horas: 3 },
        { fecha: f('2026-11-01') },
        { fecha: f('2026-10-05'), horas: 4 },
        { fecha: f('2026-10-01'), horas: 10 },
      ],
      hoy,
    );
    expect(r.horasSemana).toBe(3.5);
    expect(r.horas30).toBe(10.5);
    expect(r.dias30).toBe(4);
    expect(r.diasSinRegistro).toBe(0);
  });

  it('cuenta los días sin registrar avances', () => {
    expect(resumenBitacora([{ fecha: f('2026-10-27') }], hoy).diasSinRegistro).toBe(7);
    expect(resumenBitacora([], hoy).diasSinRegistro).toBeNull();
  });
});
