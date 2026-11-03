import { addDays, subDays } from 'date-fns';
import { db, type ZaviroDB } from './db';
import type { Apunte, Materia, Tema } from './esquemas';
import { crearPerfil, cortesIniciales } from './operaciones';
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
      modulosActivos: modulosSugeridos('tecnologo'),
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

  return { perfiles: [tecnologo, pregrado], materias, temas, apuntes };
}

/** Indica si hay datos de ejemplo cargados. */
export async function hayDatosEjemplo(base: ZaviroDB = db) {
  return (await base.perfiles.filter((p) => p.esEjemplo === true).count()) > 0;
}
