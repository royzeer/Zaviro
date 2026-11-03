import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ZaviroDB } from './db';
import { cargarDatosEjemplo } from './datosEjemplo';
import { contarTodo, guardarAjuste, nuevoId } from './repositorio';
import {
  exportarRespaldo,
  importarRespaldo,
  nombreArchivoRespaldo,
  validarRespaldo,
} from './respaldo';

let base: ZaviroDB;
beforeEach(() => {
  base = new ZaviroDB(`prueba-${nuevoId()}`);
});
afterEach(async () => {
  await base.delete();
});

describe('respaldo en JSON', () => {
  it('exporta todo, pasa por JSON y se restaura igual en otra base', async () => {
    await cargarDatosEjemplo(base);
    await guardarAjuste('plan:x', { horasPorDia: 3 }, base);
    const antes = await contarTodo(base);
    const texto = JSON.stringify(await exportarRespaldo(base));

    const otra = new ZaviroDB(`prueba-${nuevoId()}`);
    const v = validarRespaldo(JSON.parse(texto));
    expect(v.valido).toBe(true);
    if (!v.valido) return;
    expect(v.conteo).toEqual(antes);
    await importarRespaldo(v.respaldo, 'reemplazar', otra);
    expect(await contarTodo(otra)).toEqual(antes);
    expect((await otra.ajustes.get('plan:x'))?.valor).toEqual({ horasPorDia: 3 });
    await otra.delete();
  });

  it('rechaza archivos que no son respaldos y versiones futuras', () => {
    expect(validarRespaldo({ hola: 1 }).valido).toBe(false);
    expect(validarRespaldo(null).valido).toBe(false);
    expect(
      validarRespaldo({
        formato: 'zaviro-respaldo',
        version: 99,
        exportadoEn: '',
        datos: {},
        ajustes: [],
      }).valido,
    ).toBe(false);
  });

  it('no importa nada si un registro no es válido y dice cuál', async () => {
    const r = await exportarRespaldo(base);
    r.datos.temas = [{ id: 't1', materiaId: 'm1', titulo: '', pesoParcial: 150, dominio: 0 }];
    const v = validarRespaldo(JSON.parse(JSON.stringify(r)));
    expect(v.valido).toBe(false);
    if (v.valido) return;
    expect(v.problemas[0]).toMatchObject({ tabla: 'temas', indice: 0 });
    expect(v.problemas[0]!.mensaje).toMatch(/titulo|pesoParcial/);
  });

  it('combinar conserva lo que ya había; reemplazar lo quita', async () => {
    await cargarDatosEjemplo(base);
    const respaldo = await exportarRespaldo(base);
    const otra = new ZaviroDB(`prueba-${nuevoId()}`);
    await otra.temas.put({
      id: 'propio',
      materiaId: 'm',
      titulo: 'Mío',
      pesoParcial: 10,
      dominio: 0,
    });
    await importarRespaldo(respaldo, 'combinar', otra);
    expect(await otra.temas.get('propio')).toBeDefined();
    await importarRespaldo(respaldo, 'reemplazar', otra);
    expect(await otra.temas.get('propio')).toBeUndefined();
    await otra.delete();
  });

  it('nombra el archivo con la fecha', () => {
    expect(nombreArchivoRespaldo(new Date(2026, 10, 3))).toBe('zaviro-respaldo-2026-11-03.json');
  });
});
