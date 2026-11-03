import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ZaviroDB } from './db';
import { ahoraIso, guardar, nuevoId, obtenerAjuste } from './repositorio';
import {
  activarPerfil,
  borrarMateria,
  borrarPerfil,
  borrarTema,
  CLAVE_PERFIL_ACTIVO,
  cortesIniciales,
  crearPerfil,
  perfilActivo,
} from './operaciones';
import { modulosSugeridos, reglasSugeridas } from '@/dominio/niveles';
import type { Nivel } from '@/dominio/catalogo';

let base: ZaviroDB;
beforeEach(async () => {
  base = new ZaviroDB(`prueba-${nuevoId()}`);
  await base.open();
});
afterEach(() => base.delete());

const nuevo = (nivel: Nivel) =>
  crearPerfil(
    {
      nivel,
      area: 'ingenieria',
      institucion: 'X',
      reglas: reglasSugeridas(nivel),
      modulosActivos: modulosSugeridos(nivel),
    },
    base,
  );

async function sembrarMateria(perfilId: string) {
  const materia = await guardar(
    'materias',
    {
      id: nuevoId(),
      perfilId,
      nombre: 'Cálculo',
      color: '#8b6f52',
      tipo: 'cuantitativa',
      cortes: [],
    },
    base,
  );
  const tema = await guardar(
    'temas',
    { id: nuevoId(), materiaId: materia.id, titulo: 'Derivadas', pesoParcial: 40, dominio: 0 },
    base,
  );
  const apunte = await guardar(
    'apuntes',
    {
      id: nuevoId(),
      materiaId: materia.id,
      temaId: tema.id,
      contenido: '# Regla de la cadena',
      fecha: ahoraIso(),
    },
    base,
  );
  const error = await guardar(
    'errores',
    {
      id: nuevoId(),
      materiaId: materia.id,
      temaId: tema.id,
      tipo: 'calculo',
      enunciado: 'd/dx sen(2x)',
      miRespuesta: 'cos(2x)',
      solucionCorrecta: '2cos(2x)',
      conceptoIds: [],
      fecha: ahoraIso(),
      resuelto: false,
    },
    base,
  );
  await guardar(
    'tarjetas',
    {
      id: nuevoId(),
      origenTipo: 'error',
      origenId: error.id,
      temaId: tema.id,
      frente: 'd/dx sen(2x)',
      reverso: '2cos(2x)',
      facilidad: 2.5,
      intervalo: 0,
      repeticiones: 0,
      proximoRepaso: ahoraIso(),
    },
    base,
  );
  const raiz = await guardar(
    'conceptosRaiz',
    {
      id: nuevoId(),
      nombre: 'Regla de la cadena',
      descripcion: '',
      nivelOrigen: 'bachillerato',
      temaIds: [tema.id, 'otro'],
    },
    base,
  );
  return { materia, tema, apunte, error, raiz };
}

describe('operaciones de perfil', () => {
  it('crear un perfil lo deja activo', async () => {
    const p = await nuevo('profesional');
    expect(await obtenerAjuste(CLAVE_PERFIL_ACTIVO, base)).toBe(p.id);
    expect((await perfilActivo(base))?.id).toBe(p.id);
  });

  it('permite varios perfiles activos y cambiar entre ellos sin perder datos', async () => {
    const tecnologo = await nuevo('tecnologo');
    const profesional = await nuevo('profesional');
    await sembrarMateria(tecnologo.id);
    await activarPerfil(tecnologo.id, base);
    expect((await perfilActivo(base))?.nivel).toBe('tecnologo');
    await activarPerfil(profesional.id, base);
    expect((await perfilActivo(base))?.nivel).toBe('profesional');
    expect(await base.materias.where('perfilId').equals(tecnologo.id).count()).toBe(1);
  });

  it('borrar el perfil activo borra sus datos y activa otro', async () => {
    const otro = await nuevo('bachillerato');
    const p = await nuevo('maestria');
    await sembrarMateria(p.id);
    await borrarPerfil(p.id, base);
    expect(await base.materias.count()).toBe(0);
    expect(await base.temas.count()).toBe(0);
    expect(await base.tarjetas.count()).toBe(0);
    expect((await perfilActivo(base))?.id).toBe(otro.id);
  });
});

describe('borrado en cascada', () => {
  it('borrar una materia borra temas, apuntes, errores y tarjetas, y limpia las raíces', async () => {
    const p = await nuevo('profesional');
    const { materia, raiz } = await sembrarMateria(p.id);
    await borrarMateria(materia.id, base);
    expect(await base.temas.count()).toBe(0);
    expect(await base.apuntes.count()).toBe(0);
    expect(await base.errores.count()).toBe(0);
    expect(await base.tarjetas.count()).toBe(0);
    expect((await base.conceptosRaiz.get(raiz.id))?.temaIds).toEqual(['otro']);
  });

  it('borrar un tema conserva el apunte en la materia', async () => {
    const p = await nuevo('profesional');
    const { tema, apunte } = await sembrarMateria(p.id);
    await borrarTema(tema.id, base);
    const a = await base.apuntes.get(apunte.id);
    expect(a).toBeDefined();
    expect(a?.temaId).toBeUndefined();
    expect(await base.errores.count()).toBe(0);
  });
});

describe('cortes iniciales de una materia', () => {
  it('copia los cortes del perfil profesional', () => {
    expect(cortesIniciales(reglasSugeridas('profesional')).map((c) => c.peso)).toEqual([
      30, 30, 40,
    ]);
  });
  it('las evidencias arrancan pendientes', () => {
    expect(
      cortesIniciales(reglasSugeridas('tecnologo')).every((c) => c.estado === 'pendiente'),
    ).toBe(true);
  });
  it('doctorado no crea cortes', () => {
    expect(cortesIniciales(reglasSugeridas('doctorado'))).toEqual([]);
  });
});

describe('datos de ejemplo', () => {
  it('se cargan válidos y se borran sin tocar los datos reales', async () => {
    const { cargarDatosEjemplo } = await import('./datosEjemplo');
    const { borrarDatosEjemplo, contarTodo } = await import('./repositorio');
    const real = await nuevo('maestria');
    await sembrarMateria(real.id);
    const ejemplo = await cargarDatosEjemplo(base);
    expect(ejemplo.perfiles).toHaveLength(2);
    expect((await contarTodo(base)).materias).toBe(7);
    await borrarDatosEjemplo(base);
    const conteo = await contarTodo(base);
    expect(conteo.perfiles).toBe(1);
    expect(conteo.materias).toBe(1);
    expect(conteo.temas).toBe(1);
    expect(conteo.apuntes).toBe(1);
  });
});

describe('errores y conceptos raíz', () => {
  it('registrar un error enlaza sus raíces con el tema', async () => {
    const { registrarError, crearConcepto } = await import('./operaciones');
    const p = await nuevo('profesional');
    const { materia, tema } = await sembrarMateria(p.id);
    const despejes = await crearConcepto({ nombre: 'Despejes', nivelOrigen: 'bachillerato' }, base);
    await registrarError(
      {
        id: nuevoId(),
        materiaId: materia.id,
        temaId: tema.id,
        tipo: 'procedimiento',
        enunciado: '',
        miRespuesta: '',
        solucionCorrecta: '',
        conceptoIds: [despejes.id],
        fecha: ahoraIso(),
        resuelto: false,
      },
      base,
    );
    expect((await base.conceptosRaiz.get(despejes.id))?.temaIds).toEqual([tema.id]);
  });

  it('no duplica conceptos con el mismo nombre', async () => {
    const { crearConcepto } = await import('./operaciones');
    const a = await crearConcepto({ nombre: 'Derivadas', nivelOrigen: 'profesional' }, base);
    const b = await crearConcepto({ nombre: ' derivadas ', nivelOrigen: 'bachillerato' }, base);
    expect(b.id).toBe(a.id);
    expect(await base.conceptosRaiz.count()).toBe(1);
  });

  it('borrar un concepto lo quita de los errores', async () => {
    const { borrarConcepto } = await import('./operaciones');
    const p = await nuevo('profesional');
    const { error, raiz } = await sembrarMateria(p.id);
    await base.errores.update(error.id, { conceptoIds: [raiz.id] });
    await borrarConcepto(raiz.id, base);
    expect((await base.errores.get(error.id))?.conceptoIds).toEqual([]);
  });

  it('borrar un error borra sus tarjetas', async () => {
    const { borrarError } = await import('./operaciones');
    const p = await nuevo('profesional');
    const { error } = await sembrarMateria(p.id);
    await borrarError(error.id, base);
    expect(await base.tarjetas.count()).toBe(0);
  });
});
