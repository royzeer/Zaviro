import { addDays, subDays } from 'date-fns';
import type { ZaviroDB } from './db';
import type { Lectura, Materia } from './esquemas';
import { crearPerfil, cortesIniciales } from './operaciones';
import { guardar, nuevoId } from './repositorio';
import { modulosSugeridos, reglasSugeridas } from '@/dominio/niveles';
import { puntajeGlobal } from '@/dominio/saber11';
import { GENERICOS_SUGERIDOS } from '@/dominio/saberPro';

/**
 * Datos de ejemplo de los módulos por nivel: Saber 11 (bachillerato), Saber TyT (tecnólogo),
 * trabajo de grado, lecturas y bitácora (maestría). Todo queda marcado con `esEjemplo`.
 */
export async function cargarModulosEjemplo(hoy: Date, tecnologoId: string, base: ZaviroDB) {
  const iso = (d: Date) => d.toISOString();
  const esEjemplo = true;

  // Bachillerato con simulacros Saber 11.
  const colegio = await crearPerfil(
    {
      nivel: 'bachillerato',
      area: 'naturales',
      institucion: 'Colegio de ejemplo',
      programa: 'Grado 11',
      reglas: reglasSugeridas('bachillerato'),
      modulosActivos: modulosSugeridos('bachillerato'),
      esEjemplo,
    },
    base,
  );
  const matematicas: Materia = {
    id: nuevoId(),
    perfilId: colegio.id,
    nombre: 'Matemáticas',
    color: '#3d6b8c',
    tipo: 'cuantitativa',
    cortes: cortesIniciales(colegio.reglas),
    fechaParcial: iso(addDays(hoy, 12)),
    esEjemplo,
  };
  await guardar('materias', matematicas, base);
  for (const [titulo, peso, dominio] of [
    ['Funciones y gráficas', 40, 0.45],
    ['Probabilidad', 30, 0.3],
  ] as const)
    await guardar(
      'temas',
      { id: nuevoId(), materiaId: matematicas.id, titulo, pesoParcial: peso, dominio, esEjemplo },
      base,
    );
  const simulacros = [
    { dias: 120, p: [52, 45, 50, 48, 55] },
    { dias: 80, p: [58, 47, 54, 52, 58] },
    { dias: 40, p: [61, 50, 57, 55, 62] },
    { dias: 10, p: [64, 49, 60, 58, 66] },
  ];
  for (const s of simulacros) {
    const [lc, m, sc, cn, i] = s.p as [number, number, number, number, number];
    const puntajes = {
      lecturaCritica: lc,
      matematicas: m,
      socialesCiudadanas: sc,
      cienciasNaturales: cn,
      ingles: i,
    };
    await guardar(
      'simulacros',
      {
        id: nuevoId(),
        perfilId: colegio.id,
        fecha: iso(subDays(hoy, s.dias)),
        puntajes,
        puntajeGlobal: puntajeGlobal(puntajes),
        esEjemplo,
      },
      base,
    );
  }

  // Saber TyT en el perfil de tecnólogo.
  const modulos = [
    ...GENERICOS_SUGERIDOS.map((nombre) => ({ nombre, tipo: 'generico' as const })),
    { nombre: 'Desarrollo de software', tipo: 'especifico' as const },
  ].map((m) => ({ id: nuevoId(), perfilId: tecnologoId, esEjemplo, ...m }));
  for (const m of modulos) await guardar('modulosSaberPro', m, base);
  const practicas: [number, number, number, number][] = [
    // módulo, días atrás, aciertos, preguntas
    [0, 30, 14, 20],
    [0, 10, 16, 20],
    [1, 25, 8, 20],
    [1, 6, 10, 20],
    [2, 20, 13, 20],
    [4, 15, 12, 15],
    [5, 12, 9, 15],
    [5, 3, 8, 15],
  ];
  for (const [mi, dias, aciertos, preguntas] of practicas)
    await guardar(
      'practicasSaberPro',
      {
        id: nuevoId(),
        perfilId: tecnologoId,
        moduloId: modulos[mi]!.id,
        fecha: iso(subDays(hoy, dias)),
        aciertos,
        preguntas,
        esEjemplo,
      },
      base,
    );

  // Maestría con trabajo de grado, lecturas y bitácora.
  const reglasMaestria = reglasSugeridas('maestria');
  const maestria = await crearPerfil(
    {
      nivel: 'maestria',
      area: 'sociales',
      institucion: 'Universidad de ejemplo',
      programa: 'Maestría en Educación',
      reglas: reglasMaestria,
      modulosActivos: [...modulosSugeridos('maestria'), 'bitacora'],
      esEjemplo,
    },
    base,
  );
  const cursos: Materia[] = [
    {
      id: nuevoId(),
      perfilId: maestria.id,
      nombre: 'Seminario de investigación I',
      color: '#7a5c8e',
      creditos: 3,
      tipo: 'teorica',
      cortes: cortesIniciales(reglasMaestria).map((c) => ({ ...c, nota: 4.3 })),
      estado: 'aprobada',
      notaFinal: 4.3,
      periodoAcademico: '2026-1',
      esEjemplo,
    },
    {
      id: nuevoId(),
      perfilId: maestria.id,
      nombre: 'Evaluación del aprendizaje',
      color: '#4f7d74',
      creditos: 3,
      tipo: 'teorica',
      cortes: cortesIniciales(reglasMaestria).map((c) => ({ ...c, nota: 3.7 })),
      estado: 'aprobada',
      notaFinal: 3.7,
      periodoAcademico: '2026-1',
      esEjemplo,
    },
  ];
  for (const c of cursos) await guardar('materias', c, base);

  const hitos = [
    {
      titulo: 'Propuesta',
      dias: -90,
      estado: 'aprobado' as const,
      notas: 'Aprobada con ajustes menores en la pregunta.',
    },
    { titulo: 'Marco teórico', dias: -20, estado: 'entregado' as const, notas: '' },
    {
      titulo: 'Metodología',
      dias: -3,
      estado: 'enCurso' as const,
      notas: 'Falta justificar el tamaño de la muestra.',
    },
    { titulo: 'Avances', dias: 45, estado: 'pendiente' as const, notas: '' },
    { titulo: 'Sustentación', dias: 140, estado: 'pendiente' as const, notas: '' },
  ].map((h) => ({
    id: nuevoId(),
    perfilId: maestria.id,
    titulo: h.titulo,
    fecha: iso(addDays(hoy, h.dias)),
    estado: h.estado,
    notas: h.notas,
    esEjemplo,
  }));
  for (const h of hitos) await guardar('hitos', h, base);

  const lecturas: Lectura[] = [
    {
      id: nuevoId(),
      perfilId: maestria.id,
      referencia:
        'Hernández Sampieri, R., Fernández, C. y Baptista, P. (2014). Metodología de la investigación (6.ª ed.). McGraw-Hill.',
      estado: 'leida',
      notas: 'Útil para justificar el enfoque mixto y el muestreo no probabilístico.',
      citas: [
        {
          texto:
            'La investigación es un conjunto de procesos sistemáticos, críticos y empíricos que se aplican al estudio de un fenómeno o problema.',
          fuente: '',
          pagina: '4',
        },
      ],
      esEjemplo,
    },
    {
      id: nuevoId(),
      perfilId: maestria.id,
      referencia: 'Eco, U. (1977). Cómo se hace una tesis. Gedisa.',
      estado: 'leyendo',
      notas: 'Capítulo 3 sobre fichas de lectura: aplicar a mi banco de citas.',
      citas: [
        {
          texto:
            'Hacer una tesis significa aprender a poner orden en las propias ideas y a ordenar los datos.',
          fuente: 'Eco (1977)',
          pagina: '22',
        },
      ],
      esEjemplo,
    },
    {
      id: nuevoId(),
      perfilId: maestria.id,
      referencia:
        'Creswell, J. W. (2014). Research design: Qualitative, quantitative, and mixed methods approaches (4th ed.). SAGE.',
      estado: 'porLeer',
      notas: '',
      citas: [],
      esEjemplo,
    },
  ];
  for (const l of lecturas) await guardar('lecturas', l, base);

  const bitacora = [
    {
      dias: 12,
      horas: 2,
      texto: 'Revisé la retroalimentación del marco teórico y ajusté la sección de antecedentes.',
      hito: 1,
    },
    {
      dias: 6,
      horas: 1.5,
      texto: 'Primer borrador del diseño metodológico. Dudas sobre la muestra.',
      hito: 2,
    },
    {
      dias: 4,
      horas: 3,
      texto:
        'Reunión con la directora: sugiere un muestreo intencional y justificarlo con Hernández Sampieri.',
      hito: 2,
    },
    {
      dias: 1,
      horas: 2.5,
      texto: 'Redacté la justificación del muestreo y el instrumento de entrevista.',
      hito: 2,
    },
  ];
  for (const b of bitacora)
    await guardar(
      'bitacora',
      {
        id: nuevoId(),
        perfilId: maestria.id,
        fecha: iso(subDays(hoy, b.dias)),
        texto: b.texto,
        horas: b.horas,
        hitoId: hitos[b.hito]!.id,
        esEjemplo,
      },
      base,
    );

  return { colegio, maestria };
}
