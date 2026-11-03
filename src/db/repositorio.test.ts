import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import { ZaviroDB } from './db';
import {
  ahoraIso,
  borrarDatosEjemplo,
  contarTodo,
  guardar,
  guardarAjuste,
  nuevoId,
  obtenerAjuste,
} from './repositorio';
import type { PerfilAcademico } from './esquemas';

function perfilBase(extra: Partial<PerfilAcademico> = {}): PerfilAcademico {
  return {
    id: nuevoId(),
    nivel: 'profesional',
    area: 'ingenieria',
    institucion: 'Universidad de prueba',
    reglas: {
      usaNotas: true,
      escala: { minimo: 0, maximo: 5, aprobatoria: 3, decimales: 1 },
      categoriasDesempeno: [],
      evaluacion: {
        tipo: 'cortes',
        componentes: [
          { nombre: 'Corte 1', peso: 30 },
          { nombre: 'Corte 2', peso: 30 },
          { nombre: 'Corte 3', peso: 40 },
        ],
      },
      creditos: { activados: true, horasPorCredito: 48, proporcionDocente: 1 / 3 },
      promedio: { notaMinimaMateria: 3, ponderadoPorCreditos: true, promedioAcumuladoMinimo: null },
      repaso: { intervalosIniciales: [1, 3] },
    },
    modulosActivos: ['materias', 'apuntes', 'errores'],
    creadoEn: ahoraIso(),
    ...extra,
  };
}

let base: ZaviroDB;

beforeEach(async () => {
  base = new ZaviroDB(`prueba-${nuevoId()}`);
  await base.open();
});

afterEach(async () => {
  await base.delete();
});

describe('repositorio', () => {
  it('guarda un perfil válido y lo recupera', async () => {
    const p = perfilBase();
    await guardar('perfiles', p, base);
    expect(await base.perfiles.get(p.id)).toEqual(p);
  });

  it('rechaza un perfil con escala inválida', async () => {
    const p = perfilBase();
    p.reglas.escala = { minimo: 5, maximo: 1, aprobatoria: 3, decimales: 1 };
    await expect(guardar('perfiles', p, base)).rejects.toBeInstanceOf(ZodError);
    expect(await base.perfiles.count()).toBe(0);
  });

  it('rechaza una nota aprobatoria fuera de la escala', async () => {
    const p = perfilBase();
    p.reglas.escala = { minimo: 0, maximo: 5, aprobatoria: 6, decimales: 1 };
    await expect(guardar('perfiles', p, base)).rejects.toBeInstanceOf(ZodError);
  });

  it('borra solo los datos de ejemplo', async () => {
    const real = perfilBase();
    const ejemplo = perfilBase({ esEjemplo: true });
    await guardar('perfiles', real, base);
    await guardar('perfiles', ejemplo, base);
    await guardar(
      'materias',
      {
        id: nuevoId(),
        perfilId: ejemplo.id,
        nombre: 'Cálculo',
        color: '#8b6f52',
        tipo: 'cuantitativa',
        cortes: [],
        esEjemplo: true,
      },
      base,
    );
    expect(await borrarDatosEjemplo(base)).toBe(2);
    const conteo = await contarTodo(base);
    expect(conteo.perfiles).toBe(1);
    expect(conteo.materias).toBe(0);
    expect(await base.perfiles.get(real.id)).toBeDefined();
  });

  it('guarda y lee ajustes', async () => {
    await guardarAjuste('perfilActivoId', 'abc', base);
    expect(await obtenerAjuste<string>('perfilActivoId', base)).toBe('abc');
    expect(await obtenerAjuste('noExiste', base)).toBeUndefined();
  });

  it('busca errores por concepto raíz con el índice multivalor', async () => {
    const conceptoId = nuevoId();
    await guardar(
      'errores',
      {
        id: nuevoId(),
        materiaId: 'm1',
        temaId: 't1',
        tipo: 'procedimiento',
        enunciado: 'Despejar x',
        miRespuesta: 'x = 2',
        solucionCorrecta: 'x = -2',
        conceptoIds: [conceptoId, 'otro'],
        fecha: ahoraIso(),
        resuelto: false,
      },
      base,
    );
    expect(await base.errores.where('conceptoIds').equals(conceptoId).count()).toBe(1);
  });
});
