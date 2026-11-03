import { beforeEach, describe, expect, it } from 'vitest';
import { ZaviroDB, TABLAS_DATOS } from '@/db/db';
import { guardar, guardarAjuste } from '@/db/repositorio';
import { marcarTransaccionRemota, rastrearCambios } from './rastreo';
import { contarPendientes, listarPendientes, vaciarPendientes } from './pendientes';

let base: ZaviroDB;
let avisos = 0;

const materia = (id: string) => ({
  id,
  perfilId: 'p1',
  nombre: `Materia ${id}`,
  color: '#7a6a5c',
  tipo: 'teorica' as const,
  cortes: [],
});

beforeEach(async () => {
  base = new ZaviroDB(`rastreo-${Math.random()}`);
  avisos = 0;
  rastrearCambios(base, [...TABLAS_DATOS, 'ajustes'], () => avisos++);
  await base.open();
  vaciarPendientes();
});

const claves = () =>
  listarPendientes()
    .map((p) => `${p.tabla}:${p.id}`)
    .sort();

describe('rastrearCambios', () => {
  it('anota lo que se guarda, se cambia y se borra', async () => {
    await base.materias.put(materia('a'));
    await base.materias.bulkPut([materia('b'), materia('c')]);
    await guardarAjuste('perfilActivo', 'p1', base);
    expect(claves()).toEqual(['ajustes:perfilActivo', 'materias:a', 'materias:b', 'materias:c']);
    expect(avisos).toBe(3);

    vaciarPendientes();
    await base.materias.update('a', { nombre: 'Otra' });
    await base.materias.where('id').anyOf(['b']).delete();
    await base.materias.delete('c');
    expect(claves()).toEqual(['materias:a', 'materias:b', 'materias:c']);
  });

  it('anota los registros que borra clear()', async () => {
    await base.materias.bulkPut([materia('a'), materia('b')]);
    vaciarPendientes();
    await base.materias.clear();
    expect(claves()).toEqual(['materias:a', 'materias:b']);
  });

  it('no anota lo que llega del servidor', async () => {
    await base.transaction('rw', base.materias, async () => {
      marcarTransaccionRemota();
      await base.materias.put(materia('r'));
    });
    expect(contarPendientes()).toBe(0);
    // Las escrituras normales siguen anotándose después.
    await base.materias.put(materia('s'));
    expect(claves()).toEqual(['materias:s']);
  });

  it('funciona también con guardar()', async () => {
    await guardar('materias', materia('z'), base);
    expect(claves()).toEqual(['materias:z']);
  });
});
