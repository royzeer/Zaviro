import { addDays, subDays } from 'date-fns';
import { db, type ZaviroDB } from './db';
import type { Apunte, ConceptoRaiz, ErrorRegistrado, Materia, Tema } from './esquemas';
import type { Nivel, TipoError } from '@/dominio/catalogo';
import {
  activarPerfil,
  crearPerfil,
  cortesIniciales,
  recalcularDominios,
  registrarError,
} from './operaciones';
import { cargarModulosEjemplo } from './datosEjemploModulos';
import type { Calificacion } from '@/dominio/repaso';
import { guardar, nuevoId } from './repositorio';
import { modulosSugeridos, reglasSugeridas } from '@/dominio/niveles';

/**
 * Datos de ejemplo para probar la app. Todos quedan marcados con `esEjemplo`
 * y se borran con el botón "Borrar datos de ejemplo" sin tocar los datos reales.
 */
export async function cargarDatosEjemplo(base: ZaviroDB = db) {
  const hoy = new Date();
  const iso = (d: Date) => d.toISOString();

  const tecnologo = await crearPerfil(
    {
      nivel: 'tecnologo',
      area: 'programacion',
      institucion: 'Instituto de ejemplo',
      programa: 'Tecnología en análisis y desarrollo de software',
      reglas: reglasSugeridas('tecnologo'),
      modulosActivos: [...modulosSugeridos('tecnologo'), 'saberPro'],
      esEjemplo: true,
    },
    base,
  );

  const reglasPregrado = reglasSugeridas('profesional');
  const pregrado = await crearPerfil(
    {
      nivel: 'profesional',
      area: 'ingenieria',
      institucion: 'Universidad de ejemplo',
      programa: 'Ingeniería civil',
      reglas: reglasPregrado,
      modulosActivos: modulosSugeridos('profesional'),
      creditosPrograma: 165,
      esEjemplo: true,
    },
    base,
  );

  const materia = (
    perfilId: string,
    datos: Omit<Materia, 'id' | 'perfilId' | 'esEjemplo'>,
  ): Materia => ({
    id: nuevoId(),
    perfilId,
    esEjemplo: true,
    ...datos,
  });

  const conNotas = (notas: (number | undefined)[]) =>
    cortesIniciales(reglasPregrado).map((c, i) => ({
      ...c,
      ...(notas[i] !== undefined ? { nota: notas[i] } : {}),
    }));

  const calculo1 = materia(pregrado.id, {
    nombre: 'Cálculo diferencial',
    color: '#3d6b8c',
    creditos: 4,
    tipo: 'cuantitativa',
    cortes: conNotas([3.8, 4.2, 4]),
    estado: 'aprobada',
    notaFinal: 4,
    periodoAcademico: '2025-2',
  });
  const algebra = materia(pregrado.id, {
    nombre: 'Álgebra lineal',
    color: '#7a5c8e',
    creditos: 3,
    tipo: 'cuantitativa',
    cortes: conNotas([3.4, 3.9, 3.6]),
    estado: 'aprobada',
    notaFinal: 3.6,
    periodoAcademico: '2025-2',
  });
  const calculo2 = materia(pregrado.id, {
    nombre: 'Cálculo integral',
    color: '#2e7d3c',
    creditos: 4,
    tipo: 'cuantitativa',
    cortes: conNotas([3.2]),
    estado: 'cursando',
    prerrequisitos: [calculo1.id],
    fechaParcial: iso(addDays(hoy, 9)),
    periodoAcademico: '2026-2',
  });
  const estatica = materia(pregrado.id, {
    nombre: 'Estática',
    color: '#a85c2a',
    creditos: 3,
    tipo: 'cuantitativa',
    cortes: conNotas([2.8]),
    estado: 'cursando',
    prerrequisitos: [calculo1.id],
    fechaParcial: iso(addDays(hoy, 5)),
    periodoAcademico: '2026-2',
  });
  const lectura = materia(pregrado.id, {
    nombre: 'Comunicación escrita',
    color: '#8b6f52',
    creditos: 2,
    tipo: 'teorica',
    cortes: conNotas([4.1]),
    estado: 'cursando',
    fechaParcial: iso(addDays(hoy, 14)),
    periodoAcademico: '2026-2',
  });

  const programacion = materia(tecnologo.id, {
    nombre: 'Programación orientada a objetos',
    color: '#4f7d74',
    tipo: 'programacion',
    cortes: cortesIniciales(tecnologo.reglas).map((c, i) => ({
      ...c,
      estado: i === 0 ? 'aprobada' : i === 1 ? 'enRevision' : 'pendiente',
    })),
    estado: 'cursando',
    fechaParcial: iso(addDays(hoy, 7)),
  });

  const materias = [calculo1, algebra, calculo2, estatica, lectura, programacion];
  for (const m of materias) await guardar('materias', m, base);

  const tema = (materiaId: string, titulo: string, pesoParcial: number, dominio: number): Tema => ({
    id: nuevoId(),
    materiaId,
    titulo,
    pesoParcial,
    dominio,
    esEjemplo: true,
  });

  const temas = [
    tema(calculo2.id, 'Integración por sustitución', 30, 0.55),
    tema(calculo2.id, 'Integración por partes', 30, 0.35),
    tema(calculo2.id, 'Fracciones parciales', 25, 0.2),
    tema(calculo2.id, 'Área entre curvas', 15, 0.6),
    tema(estatica.id, 'Diagrama de cuerpo libre', 30, 0.5),
    tema(estatica.id, 'Equilibrio de partículas', 35, 0.4),
    tema(estatica.id, 'Momento de una fuerza', 35, 0.25),
    tema(lectura.id, 'Estructura del párrafo argumentativo', 50, 0.7),
    tema(lectura.id, 'Citación en normas APA', 50, 0.45),
    tema(programacion.id, 'Clases y objetos', 30, 0.75),
    tema(programacion.id, 'Herencia y polimorfismo', 40, 0.4),
    tema(programacion.id, 'Manejo de excepciones', 30, 0.3),
  ];
  for (const t of temas) await guardar('temas', t, base);

  const apunte = (
    materiaId: string,
    temaId: string | undefined,
    titulo: string,
    contenido: string,
    dias: number,
  ): Apunte => ({
    id: nuevoId(),
    materiaId,
    ...(temaId ? { temaId } : {}),
    titulo,
    contenido,
    fecha: iso(subDays(hoy, dias)),
    esEjemplo: true,
  });

  const apuntes = [
    apunte(
      calculo2.id,
      temas[1]!.id,
      'Integración por partes',
      '## Fórmula\n\n`∫ u dv = u·v − ∫ v du`\n\n## Cómo escoger u\n\nUsa el orden **LIATE**: logarítmicas, inversas trigonométricas, algebraicas, trigonométricas y exponenciales.\n\n- Si al derivar *u* se simplifica, vas bien.\n- Si la nueva integral es más difícil, cambia la elección.',
      2,
    ),
    apunte(
      estatica.id,
      temas[4]!.id,
      'Pasos para el diagrama de cuerpo libre',
      '1. Aísla el cuerpo.\n2. Dibuja **todas** las fuerzas externas: peso, normales, tensiones y fricción.\n3. Elige ejes que simplifiquen las ecuaciones.\n4. Descompón cada fuerza en x e y.\n\n> Si una fuerza no toca el cuerpo, no va en el diagrama (salvo el peso).',
      4,
    ),
    apunte(
      programacion.id,
      temas[10]!.id,
      'Polimorfismo',
      'Una referencia de la clase padre puede apuntar a un objeto de la clase hija.\n\n```\nAnimal a = new Perro();\na.sonido(); // usa el método de Perro\n```',
      1,
    ),
  ];
  for (const a of apuntes) await guardar('apuntes', a, base);

  const concepto = (nombre: string, nivelOrigen: Nivel, descripcion = ''): ConceptoRaiz => ({
    id: nuevoId(),
    nombre,
    descripcion,
    nivelOrigen,
    temaIds: [],
    esEjemplo: true,
  });
  const despejes = concepto(
    'Despejes',
    'bachillerato',
    'Aislar una variable en una ecuación sin cambiar su sentido.',
  );
  const fracciones = concepto('Fracciones algebraicas', 'bachillerato');
  const trigonometria = concepto('Razones trigonométricas', 'bachillerato');
  const vectores = concepto('Descomposición de vectores', 'bachillerato');
  const cadena = concepto('Regla de la cadena', 'profesional');
  const lecturaCritica = concepto('Comprensión lectora', 'bachillerato');
  const logica = concepto('Lógica condicional', 'tecnologo');
  const conceptos = [despejes, fracciones, trigonometria, vectores, cadena, lecturaCritica, logica];
  for (const c of conceptos) await guardar('conceptosRaiz', c, base);

  const errores: ErrorRegistrado[] = [];
  const fallo = async (
    materiaId: string,
    temaIdx: number,
    tipo: TipoError,
    raices: ConceptoRaiz[],
    dias: number,
    resuelto = false,
    enunciado = '',
    miRespuesta = '',
    solucionCorrecta = '',
  ) => {
    const e: ErrorRegistrado = {
      id: nuevoId(),
      materiaId,
      temaId: temas[temaIdx]!.id,
      tipo,
      enunciado,
      miRespuesta,
      solucionCorrecta,
      conceptoIds: raices.map((r) => r.id),
      fecha: iso(subDays(hoy, dias)),
      resuelto,
      esEjemplo: true,
    };
    await registrarError(e, base);
    errores.push(e);
  };
  await fallo(
    calculo2.id,
    2,
    'procedimiento',
    [fracciones, despejes],
    2,
    false,
    '∫ 1/(x² − 1) dx',
    'ln|x² − 1|',
    '½ ln|(x − 1)/(x + 1)| + C',
  );
  await fallo(
    calculo2.id,
    0,
    'calculo',
    [cadena],
    5,
    false,
    '∫ 2x·cos(x²) dx',
    'sen(x²)·x²',
    'sen(x²) + C',
  );
  await fallo(calculo2.id, 1, 'concepto', [despejes], 20, true);
  await fallo(
    estatica.id,
    6,
    'calculo',
    [trigonometria, vectores],
    1,
    false,
    'Momento de 50 N a 30° sobre una barra de 2 m',
    '100 N·m',
    '50 N·m (50 · sen 30° · 2)',
  );
  await fallo(estatica.id, 5, 'procedimiento', [despejes, vectores], 3);
  await fallo(estatica.id, 4, 'descuido', [], 9, true);
  await fallo(lectura.id, 8, 'lectura', [lecturaCritica], 4);
  await fallo(programacion.id, 11, 'concepto', [logica], 6);
  await fallo(programacion.id, 10, 'procedimiento', [logica, despejes], 30, true);

  // Tarjetas con historial de repasos, para que el dominio calculado de cada tema sea variado.
  for (const [i, t] of temas.entries()) {
    const historial: Calificacion[] =
      t.dominio >= 0.6
        ? ['bien', 'facil', 'facil']
        : t.dominio >= 0.4
          ? ['dificil', 'bien']
          : ['olvide', 'dificil'];
    const tarjetaId = nuevoId();
    await guardar(
      'tarjetas',
      {
        id: tarjetaId,
        origenTipo: 'manual',
        origenId: t.materiaId,
        temaId: t.id,
        frente: `Explica con tus palabras: ${t.titulo}`,
        reverso: 'Compara con tus apuntes del tema.',
        facilidad: 2.5,
        intervalo: historial.length * 2,
        repeticiones: historial.length,
        proximoRepaso: iso(addDays(hoy, 1 + (i % 4))),
        esEjemplo: true,
      },
      base,
    );
    for (const [j, calificacion] of historial.entries()) {
      await guardar(
        'repasos',
        {
          id: nuevoId(),
          tarjetaId,
          temaId: t.id,
          fecha: iso(subDays(hoy, (historial.length - j) * 2)),
          calificacion,
          esEjemplo: true,
        },
        base,
      );
    }
  }

  // Una tarjeta vencida para que se vea un tema "oxidado" en el árbol.
  await guardar(
    'tarjetas',
    {
      id: nuevoId(),
      origenTipo: 'apunte',
      origenId: apuntes[0]!.id,
      temaId: temas[1]!.id,
      frente: '¿Cómo se elige u en integración por partes?',
      reverso:
        'Con el orden LIATE: logarítmicas, inversas, algebraicas, trigonométricas, exponenciales.',
      facilidad: 2.5,
      intervalo: 3,
      repeticiones: 1,
      proximoRepaso: iso(subDays(hoy, 2)),
      esEjemplo: true,
    },
    base,
  );

  const { colegio, maestria } = await cargarModulosEjemplo(hoy, tecnologo.id, base);
  // El perfil de pregrado queda activo al terminar.
  await activarPerfil(pregrado.id, base);
  await recalcularDominios(hoy, base);
  return {
    perfiles: [tecnologo, pregrado, colegio, maestria],
    materias,
    temas,
    apuntes,
    conceptos,
    errores,
  };
}

/** Indica si hay datos de ejemplo cargados. */
export async function hayDatosEjemplo(base: ZaviroDB = db) {
  return (await base.perfiles.filter((p) => p.esEjemplo === true).count()) > 0;
}
