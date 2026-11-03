import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { estructurarDocumento } from '@/dominio/documentos';
import { reglasSugeridas, modulosSugeridos } from '@/dominio/niveles';
import { generarPlan } from '@/dominio/plan';
import { rendimientoDeEstudio } from '@/dominio/rendimiento';
import { ZaviroDB } from './db';
import { importarDocumento, temaParecido } from './importarDocumento';
import { crearPerfil } from './operaciones';
import { nuevoId } from './repositorio';

let base: ZaviroDB;
beforeEach(async () => {
  base = new ZaviroDB(`importar-${nuevoId()}`);
  await base.open();
});
afterEach(() => base.delete());

const documento = estructurarDocumento(
  [
    { texto: 'Física I', nivel: 1 },
    { texto: 'Cinemática', nivel: 2 },
    { texto: 'Velocidad: cambio de la posición en el tiempo, con dirección y sentido.' },
    { texto: 'La aceleración es el cambio de la velocidad en cada unidad de tiempo.' },
    { texto: 'Dinámica', nivel: 2 },
    { texto: 'Las leyes de Newton relacionan las fuerzas con el movimiento. '.repeat(10) },
  ],
  'fisica.docx',
);

async function perfil() {
  return crearPerfil(
    {
      nivel: 'profesional',
      area: 'ingenieria',
      institucion: 'U',
      reglas: reglasSugeridas('profesional'),
      modulosActivos: modulosSugeridos('profesional'),
    },
    base,
  );
}

describe('importarDocumento', () => {
  it('crea la materia, un tema y un apunte por sección y tarjetas con las definiciones', async () => {
    const p = await perfil();
    const r = await importarDocumento(
      {
        perfil: p,
        documento,
        materiaId: null,
        nombreMateria: '',
        secciones: [0, 1],
        crearTarjetas: true,
        fechaExamen: '2026-11-20T17:00:00.000Z',
      },
      base,
    );
    expect(r).toMatchObject({ temasNuevos: 2, temasExistentes: 0, apuntes: 2, tarjetas: 2 });
    const materia = await base.materias.get(r.materiaId);
    expect(materia).toMatchObject({ nombre: 'Física I', fechaParcial: '2026-11-20T17:00:00.000Z' });
    const temas = await base.temas.where('materiaId').equals(r.materiaId).sortBy('titulo');
    expect(temas.map((t) => t.titulo)).toEqual(['Cinemática', 'Dinámica']);
    expect(temas.reduce((s, t) => s + t.pesoParcial, 0)).toBe(100);
    // La sección más larga pesa más
    expect(temas[1]!.pesoParcial).toBeGreaterThan(temas[0]!.pesoParcial);
    const tarjetas = await base.tarjetas.toArray();
    expect(tarjetas.map((t) => t.frente).sort()).toEqual([
      '¿Qué es Velocidad?',
      '¿Qué es aceleración?',
    ]);

    // El plan de estudio ya incluye los temas, sin configurar nada
    const plan = generarPlan({
      rendimiento: rendimientoDeEstudio(temas, [materia!], p.reglas),
      hoy: new Date('2026-11-04T08:00:00'),
    });
    const temasEnPlan = new Set(plan.dias.flatMap((d) => d.bloques.map((b) => b.temaId)));
    expect(temasEnPlan).toEqual(new Set(temas.map((t) => t.id)));
  });

  it('reutiliza los temas que ya existen y respeta la fecha que ya tenía la materia', async () => {
    const p = await perfil();
    const primera = await importarDocumento(
      {
        perfil: p,
        documento,
        materiaId: null,
        nombreMateria: 'Física',
        secciones: [0],
        crearTarjetas: false,
        fechaExamen: '2026-11-20T17:00:00.000Z',
      },
      base,
    );
    const segunda = await importarDocumento(
      {
        perfil: p,
        documento,
        materiaId: primera.materiaId,
        nombreMateria: '',
        secciones: [0, 1],
        crearTarjetas: false,
        fechaExamen: '2026-12-01T17:00:00.000Z',
      },
      base,
    );
    expect(segunda).toMatchObject({ temasNuevos: 1, temasExistentes: 1, apuntes: 2, tarjetas: 0 });
    expect((await base.materias.get(primera.materiaId))?.fechaParcial).toBe(
      '2026-11-20T17:00:00.000Z',
    );
    expect(await base.materias.count()).toBe(1);
  });
});

describe('temaParecido', () => {
  it('compara sin tildes, mayúsculas ni signos', () => {
    const temas = [{ id: '1', titulo: 'Leyes de Newton' }];
    expect(temaParecido('LEYES DE NEWTÓN.', temas)?.id).toBe('1');
    expect(temaParecido('Energía', temas)).toBeUndefined();
  });
});
