import { describe, expect, it } from 'vitest';
import {
  contarPalabras,
  definiciones,
  estructurarDocumento,
  fechasDeExamen,
  palabrasClave,
  pesosPorExtension,
  quitarRepetidos,
  tituloLimpio,
  unirLineas,
  type Bloque,
} from './documentos';

const cuerpo = (texto: string): Bloque => ({ texto, tamano: 11 });
const titulo = (texto: string, tamano = 16): Bloque => ({ texto, tamano });

describe('unirLineas', () => {
  it('une las líneas de un párrafo y arregla los guiones de corte', () => {
    expect(
      unirLineas([
        'La cinemática estudia el movimiento de los cuer-',
        'pos sin atender las causas. Se apoya en vectores',
        'y en el tiempo para describir cada trayectoria.',
        'Fin del párrafo.',
        'Otro párrafo empieza aquí con una línea bastante',
        'larga.',
        '',
        'Uno más.',
      ]),
    ).toEqual([
      'La cinemática estudia el movimiento de los cuerpos sin atender las causas. Se apoya en vectores y en el tiempo para describir cada trayectoria. Fin del párrafo.',
      'Otro párrafo empieza aquí con una línea bastante larga.',
      'Uno más.',
    ]);
  });
});

describe('tituloLimpio', () => {
  it('quita la numeración y pasa las mayúsculas a tipo oración', () => {
    expect(tituloLimpio('2.1 Vectores en el plano')).toBe('Vectores en el plano');
    expect(tituloLimpio('Capítulo 3: Dinámica')).toBe('Dinámica');
    expect(tituloLimpio('IV. Energía')).toBe('Energía');
    expect(tituloLimpio('LEYES DE NEWTON')).toBe('Leyes de newton');
  });
});

describe('estructurarDocumento', () => {
  it('reconoce títulos de un PDF por el tamaño de la letra', () => {
    const doc = estructurarDocumento(
      [
        titulo('Física mecánica', 22),
        titulo('Cinemática'),
        cuerpo('La cinemática describe el movimiento de los cuerpos.'),
        cuerpo('Usa posición, velocidad y aceleración.'),
        titulo('Subtema: caída libre', 13),
        cuerpo('Todos los cuerpos caen con la misma aceleración en el vacío.'),
        titulo('Dinámica'),
        cuerpo('La dinámica estudia las causas del movimiento.'),
      ],
      'fisica.pdf',
    );
    expect(doc.titulo).toBe('Física mecánica');
    expect(doc.secciones.map((s) => s.titulo)).toEqual(['Cinemática', 'Dinámica']);
    expect(doc.secciones[0]!.contenido).toBe(
      'La cinemática describe el movimiento de los cuerpos. Usa posición, velocidad y aceleración.\n\n## Subtema: caída libre\n\nTodos los cuerpos caen con la misma aceleración en el vacío.',
    );
  });

  it('usa los títulos de Word y las viñetas', () => {
    const doc = estructurarDocumento(
      [
        { texto: 'Química general', nivel: 1 },
        { texto: 'Átomos', nivel: 2 },
        { texto: 'Un átomo tiene protones, neutrones y electrones.' },
        { texto: 'Protones', lista: true },
        { texto: 'Electrones', lista: true },
        { texto: 'Enlaces', nivel: 2 },
        { texto: 'Los enlaces unen átomos.' },
      ],
      'quimica.docx',
    );
    expect(doc.titulo).toBe('Química general');
    expect(doc.secciones.map((s) => s.titulo)).toEqual(['Átomos', 'Enlaces']);
    expect(doc.secciones[0]!.contenido).toBe(
      'Un átomo tiene protones, neutrones y electrones.\n\n- Protones\n- Electrones',
    );
  });

  it('reconoce títulos numerados aunque tengan el mismo tamaño', () => {
    const doc = estructurarDocumento(
      [
        cuerpo('1. Introducción a la economía'),
        cuerpo('La economía estudia cómo se asignan recursos escasos entre usos alternativos.'),
        cuerpo('2. Oferta y demanda'),
        cuerpo('El precio se forma donde se cruzan la oferta y la demanda del mercado.'),
      ],
      'economia.pdf',
    );
    expect(doc.titulo).toBe('economia');
    expect(doc.secciones.map((s) => s.titulo)).toEqual([
      'Introducción a la economía',
      'Oferta y demanda',
    ]);
  });

  it('sin títulos parte el texto en trozos con sus palabras clave', () => {
    const parrafo =
      'La fotosíntesis convierte energía lumínica en energía química dentro del cloroplasto. '.repeat(
        40,
      );
    const doc = estructurarDocumento(
      [{ texto: parrafo }, { texto: parrafo }, { texto: parrafo }],
      'biologia.txt',
    );
    expect(doc.secciones.length).toBeGreaterThan(1);
    expect(doc.secciones[0]!.titulo).toMatch(/^Parte 1: /);
    expect(doc.secciones[0]!.titulo).toContain('energía');
  });

  it('une una introducción muy corta con la primera sección', () => {
    const doc = estructurarDocumento(
      [
        cuerpo('Notas de clase.'),
        titulo('Uno'),
        cuerpo('Contenido del uno.'),
        titulo('Dos'),
        cuerpo('Contenido del dos.'),
      ],
      'notas.pdf',
    );
    expect(doc.secciones.map((s) => s.titulo)).toEqual(['Uno', 'Dos']);
    expect(doc.secciones[0]!.contenido).toBe('Notas de clase.\n\nContenido del uno.');
  });
});

describe('quitarRepetidos', () => {
  it('quita encabezados y números de página que se repiten', () => {
    const paginas = [1, 2, 3, 4].flatMap((n) => [
      { texto: 'Universidad Nacional - Física', tamano: 9, paginaNueva: true },
      { texto: `Contenido ${'abcd'[n - 1]}`, tamano: 11 },
      { texto: `Página ${n}`, tamano: 9 },
    ]);
    expect(quitarRepetidos(paginas).map((b) => b.texto)).toEqual([
      'Contenido a',
      'Contenido b',
      'Contenido c',
      'Contenido d',
    ]);
  });
});

describe('pesosPorExtension', () => {
  it('reparte 100 según las palabras, con un mínimo de 5', () => {
    expect(pesosPorExtension([100, 100])).toEqual([50, 50]);
    const p = pesosPorExtension([1000, 10, 300]);
    expect(p.reduce((s, x) => s + x, 0)).toBe(100);
    expect(Math.min(...p)).toBeGreaterThanOrEqual(5);
    expect(p[0]).toBeGreaterThan(p[2]!);
    expect(pesosPorExtension([])).toEqual([]);
    expect(pesosPorExtension(Array(30).fill(10)).reduce((s, x) => s + x, 0)).toBe(100);
  });
});

describe('palabrasClave', () => {
  it('devuelve las palabras con contenido que más se repiten', () => {
    expect(
      palabrasClave(
        'El vector tiene magnitud. Un vector tiene dirección. La magnitud del vector. Para para para.',
        2,
      ),
    ).toEqual(['vector', 'magnitud']);
  });
});

describe('fechasDeExamen', () => {
  const hoy = new Date(2026, 10, 3);
  it('encuentra fechas cerca de palabras de evaluación', () => {
    const f = fechasDeExamen(
      'El primer parcial será el 20 de noviembre. Examen final: 02/12/2026. La clase del 5 de noviembre se cancela.',
      hoy,
    );
    expect(f.map((x) => x.fecha)).toEqual([new Date(2026, 10, 20), new Date(2026, 11, 2)]);
  });
  it('pasa al año siguiente las fechas sin año que ya pasaron y descarta las inválidas', () => {
    expect(fechasDeExamen('Parcial el 10 de febrero', hoy)[0]!.fecha).toEqual(
      new Date(2027, 1, 10),
    );
    expect(fechasDeExamen('Quiz el 31/02/2027', hoy)).toEqual([]);
    expect(fechasDeExamen('Entrega 01/10/2026', hoy)).toEqual([]);
  });
});

describe('definiciones', () => {
  it('saca definiciones con dos puntos y con "es"', () => {
    const d = definiciones(
      [
        '- Velocidad: cambio de la posición en el tiempo, con dirección.',
        'La aceleración es el cambio de la velocidad en el tiempo.',
        'Nota: esto no es una definición que sirva.',
        'Ejemplo corto: no.',
      ].join('\n'),
    );
    expect(d).toEqual([
      { termino: 'Velocidad', definicion: 'cambio de la posición en el tiempo, con dirección.' },
      { termino: 'aceleración', definicion: 'el cambio de la velocidad en el tiempo' },
    ]);
  });
});

describe('contarPalabras', () => {
  it('cuenta palabras con tildes y números', () => {
    expect(contarPalabras('Año 2026: física cuántica')).toBe(4);
  });
});
