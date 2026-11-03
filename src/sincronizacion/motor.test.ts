import { beforeEach, describe, expect, it } from 'vitest';
import { ZaviroDB } from '@/db/db';
import {
  agruparEnvios,
  borrarDatosLocales,
  guardarRevisionLocal,
  MAX_CAMBIOS_POR_ENVIO,
  revisionLocal,
  sincronizar,
  TABLAS_SINCRONIZADAS,
  type ApiSincronizacion,
  type CambioRemoto,
} from './motor';
import { contarPendientes, marcarPendientes, vaciarPendientes } from './pendientes';
import { rastrearCambios } from './rastreo';

/** Servidor falso en memoria con las mismas reglas que la API real. */
function servidorFalso(porPagina = 3) {
  const filas = new Map<string, CambioRemoto & { revision: number }>();
  let revision = 0;
  const envios: CambioRemoto[][] = [];
  const api: ApiSincronizacion & { antesDeEnviar?: () => Promise<void> } = {
    async enviar(cambios) {
      await api.antesDeEnviar?.();
      envios.push(cambios);
      for (const c of cambios) filas.set(`${c.tabla}:${c.id}`, { ...c, revision: ++revision });
      return { revision };
    },
    async traer(desde) {
      const todas = [...filas.values()]
        .filter((f) => f.revision > desde)
        .sort((a, b) => a.revision - b.revision);
      const cambios = todas.slice(0, porPagina);
      return {
        cambios,
        revision: cambios.length ? cambios[cambios.length - 1]!.revision : desde,
        hayMas: todas.length > porPagina,
      };
    },
  };
  return { api, filas, envios };
}

function dispositivo() {
  const base = new ZaviroDB(`motor-${Math.random()}`);
  rastrearCambios(base, TABLAS_SINCRONIZADAS);
  return base;
}

const materia = (id: string, nombre = `Materia ${id}`) => ({
  id,
  perfilId: 'p1',
  nombre,
  color: '#7a6a5c',
  tipo: 'teorica' as const,
  cortes: [],
});

beforeEach(() => {
  vaciarPendientes();
  guardarRevisionLocal(null);
});

describe('sincronizar', () => {
  it('sube lo local y lo trae en otro dispositivo, por páginas', async () => {
    const { api, filas } = servidorFalso();
    const a = dispositivo();
    await a.materias.bulkPut([materia('1'), materia('2'), materia('3'), materia('4')]);
    await a.ajustes.put({ clave: 'perfilActivo', valor: 'p1' });
    expect(await sincronizar(a, api)).toMatchObject({ subidos: 5 });
    expect(contarPendientes()).toBe(0);
    expect(filas.size).toBe(5);

    // Otro dispositivo empieza de cero
    guardarRevisionLocal(null);
    const b = dispositivo();
    const r = await sincronizar(b, api);
    expect(r.traidos).toBe(5);
    expect(await b.materias.count()).toBe(4);
    expect(await b.ajustes.get('perfilActivo')).toEqual({ clave: 'perfilActivo', valor: 'p1' });
    expect(revisionLocal()).toBe(5);
    // Lo que llega del servidor no queda pendiente de subir
    expect(contarPendientes()).toBe(0);
  });

  it('lleva los borrados a los demás dispositivos', async () => {
    const { api } = servidorFalso();
    const a = dispositivo();
    const b = dispositivo();
    await a.materias.bulkPut([materia('1'), materia('2')]);
    await sincronizar(a, api);
    guardarRevisionLocal(null);
    await sincronizar(b, api);

    await b.materias.delete('1');
    await sincronizar(b, api);
    guardarRevisionLocal(2);
    await sincronizar(a, api);
    expect(await a.materias.get('1')).toBeUndefined();
    expect(await a.materias.get('2')).toBeDefined();
  });

  it('un cambio local sin subir no se pisa con el del servidor', async () => {
    const { api, filas } = servidorFalso();
    filas.set('materias:1', {
      tabla: 'materias',
      id: '1',
      datos: materia('1', 'Del servidor'),
      revision: 1,
    });
    const base = dispositivo();
    await base.materias.put(materia('1', 'Local'));
    // El envío falla: el cambio local sigue pendiente y no se reemplaza al traer
    api.antesDeEnviar = async () => {
      throw new Error('sin red');
    };
    await expect(sincronizar(base, api)).rejects.toThrow('sin red');
    api.antesDeEnviar = undefined;
    await sincronizar(base, api);
    expect((await base.materias.get('1'))?.nombre).toBe('Local');
    expect(filas.get('materias:1')?.datos).toMatchObject({ nombre: 'Local' });
  });

  it('si el registro cambia mientras se sube, sigue pendiente', async () => {
    const { api, filas } = servidorFalso();
    const base = dispositivo();
    await base.materias.put(materia('1', 'Primera'));
    api.antesDeEnviar = async () => {
      api.antesDeEnviar = undefined;
      await base.materias.put(materia('1', 'Segunda'));
    };
    await sincronizar(base, api);
    expect(contarPendientes()).toBe(1);
    await sincronizar(base, api);
    expect(contarPendientes()).toBe(0);
    expect(filas.get('materias:1')?.datos).toMatchObject({ nombre: 'Segunda' });
  });

  it('sube como borrado lo que ya no existe y descarta lo que no cumple el esquema', async () => {
    const { api, filas } = servidorFalso();
    const base = dispositivo();
    marcarPendientes('materias', ['fantasma']);
    await sincronizar(base, api);
    expect(filas.get('materias:fantasma')?.datos).toBeNull();

    filas.set('materias:malo', {
      tabla: 'materias',
      id: 'malo',
      datos: { id: 'malo' },
      revision: 99,
    });
    filas.set('otraCosa:x', { tabla: 'otraCosa', id: 'x', datos: { id: 'x' }, revision: 100 });
    await sincronizar(base, api);
    expect(await base.materias.get('malo')).toBeUndefined();
    expect(revisionLocal()).toBe(100);
  });

  it('borrar los datos locales no los borra del servidor', async () => {
    const { api, filas } = servidorFalso();
    const base = dispositivo();
    await base.materias.put(materia('1'));
    await sincronizar(base, api);
    await borrarDatosLocales(base);
    expect(await base.materias.count()).toBe(0);
    expect(contarPendientes()).toBe(0);
    expect(filas.get('materias:1')?.datos).not.toBeNull();
  });
});

describe('agruparEnvios', () => {
  it('parte por cantidad y por tamaño', () => {
    const muchos = Array.from({ length: MAX_CAMBIOS_POR_ENVIO * 2 + 1 }, () => ({ datos: {} }));
    expect(agruparEnvios(muchos).map((g) => g.length)).toEqual([
      MAX_CAMBIOS_POR_ENVIO,
      MAX_CAMBIOS_POR_ENVIO,
      1,
    ]);
    const grande = { datos: { t: 'x'.repeat(1_500_000) } };
    expect(agruparEnvios([grande, grande, { datos: null }]).map((g) => g.length)).toEqual([1, 2]);
    expect(agruparEnvios([])).toEqual([]);
  });
});
