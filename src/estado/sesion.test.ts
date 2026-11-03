import { describe, expect, it } from 'vitest';
import { ZaviroDB, TABLAS_DATOS } from '@/db/db';
import { hayDatosLocales, marcarTodoPendiente } from '@/sincronizacion/motor';
import { listarPendientes, vaciarPendientes } from '@/sincronizacion/pendientes';
import { planDeEntrada } from './sesion';

describe('planDeEntrada', () => {
  it('sigue con los datos del mismo usuario', () => {
    expect(planDeEntrada(7, 7, true)).toBe('continuar');
  });
  it('borra de este navegador los datos de otra cuenta', () => {
    expect(planDeEntrada(3, 7, true)).toBe('borrarLocal');
    expect(planDeEntrada(3, 7, false)).toBe('borrarLocal');
  });
  it('sube a la cuenta los datos creados antes de tener cuenta', () => {
    expect(planDeEntrada(null, 7, true)).toBe('adoptarLocal');
    expect(planDeEntrada(null, 7, false)).toBe('continuar');
  });
});

describe('datos locales sin dueño', () => {
  it('se detectan y se anotan todos para subir', async () => {
    const base = new ZaviroDB(`sesion-${Math.random()}`);
    expect(await hayDatosLocales(base)).toBe(false);
    await base.temas.bulkPut([
      { id: 't1', materiaId: 'm1', nombre: 'Uno', dominio: 0 } as never,
      { id: 't2', materiaId: 'm1', nombre: 'Dos', dominio: 0 } as never,
    ]);
    await base.ajustes.put({ clave: 'perfilActivo', valor: 'p1' });
    expect(await hayDatosLocales(base)).toBe(true);
    vaciarPendientes();
    await marcarTodoPendiente(base);
    expect(
      listarPendientes()
        .map((p) => `${p.tabla}:${p.id}`)
        .sort(),
    ).toEqual(['ajustes:perfilActivo', 'temas:t1', 'temas:t2']);
    expect(TABLAS_DATOS).toContain('temas');
  });
});
