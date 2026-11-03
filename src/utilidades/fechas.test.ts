import { describe, expect, it } from 'vitest';
import { distanciaDias, fechaInputAIso, formatoNota, isoAFechaInput } from './fechas';

describe('fechas', () => {
  it('convierte entre el campo de fecha e ISO sin cambiar el día', () => {
    const iso = fechaInputAIso('2026-11-20')!;
    expect(isoAFechaInput(iso)).toBe('2026-11-20');
    expect(fechaInputAIso('20/11/2026')).toBeUndefined();
  });

  it('describe la distancia en días', () => {
    const hoy = new Date('2026-11-03T10:00:00');
    expect(distanciaDias(new Date('2026-11-03T20:00:00').toISOString(), hoy)).toBe('hoy');
    expect(distanciaDias(new Date('2026-11-04T08:00:00').toISOString(), hoy)).toBe('mañana');
    expect(distanciaDias(new Date('2026-11-10T08:00:00').toISOString(), hoy)).toBe('en 7 días');
    expect(distanciaDias(new Date('2026-11-01T08:00:00').toISOString(), hoy)).toBe('hace 2 días');
  });

  it('formatea notas con coma decimal', () => {
    expect(formatoNota(3.456, 1)).toBe('3,5');
    expect(formatoNota(4, 2)).toBe('4,00');
  });
});
