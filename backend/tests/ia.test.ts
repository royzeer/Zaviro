// Pruebas de la parte de IA que no necesitan llamar a Claude ni a la base de datos.
import { describe, expect, it } from 'vitest';
import {
  limpiarPlan,
  MAX_CARACTERES,
  prepararEntrada,
  textoParaIa,
  type PlanIa,
} from '../src/services/ia.service';

describe('Entrada para la IA', () => {
  it('descarta secciones vacías y conserva el orden', () => {
    const e = prepararEntrada({
      archivo: 'fisica.pdf',
      secciones: [
        { titulo: 'Vectores', contenido: 'Un vector tiene magnitud y dirección.' },
        { titulo: '', contenido: '   ' },
        { titulo: 'Fuerzas', contenido: 'Segunda ley de Newton.' },
      ],
    });
    expect(e.secciones.map((s) => s.titulo)).toEqual(['Vectores', 'Fuerzas']);
  });

  it('rechaza documentos sin texto o demasiado largos', () => {
    expect(() => prepararEntrada({ secciones: [] })).toThrow(/no tiene texto/);
    expect(() =>
      prepararEntrada({ secciones: [{ titulo: 'x', contenido: 'a'.repeat(MAX_CARACTERES + 1) }] }),
    ).toThrow(/demasiado largo/);
  });

  it('numera las secciones y dice la fecha de hoy', () => {
    const texto = textoParaIa(
      prepararEntrada({
        archivo: 'a.pdf',
        nivel: 'universidad',
        secciones: [{ titulo: 'Uno', contenido: 'Hola' }],
      }),
      new Date('2026-11-05T12:00:00Z'),
    );
    expect(texto).toContain('<seccion indice="0" titulo="Uno">');
    expect(texto).toContain('Fecha de hoy: 2026-11-05');
    expect(texto).toContain('Nivel del estudiante: universidad');
  });
});

describe('Limpieza del plan', () => {
  const plan: PlanIa = {
    materia: '  Física I ',
    resumen: 'Mecánica',
    fechaExamen: '15 de noviembre',
    temas: [
      {
        titulo: 'Vectores',
        secciones: [0, 0, 7, -1],
        importancia: 14,
        dificultad: 'media',
        resumen: '- Magnitud y dirección',
        tarjetas: [
          { pregunta: '¿Qué es un vector?', respuesta: 'Magnitud y dirección' },
          { pregunta: ' ', respuesta: 'vacía' },
        ],
      },
      {
        titulo: '  ',
        secciones: [],
        importancia: 3,
        dificultad: 'baja',
        resumen: '',
        tarjetas: [],
      },
    ],
  };

  it('deja todo dentro de rango', () => {
    const l = limpiarPlan(plan, 2);
    expect(l.materia).toBe('Física I');
    expect(l.fechaExamen).toBeNull();
    expect(l.temas).toHaveLength(1);
    expect(l.temas[0]).toMatchObject({ secciones: [0], importancia: 10 });
    expect(l.temas[0]!.tarjetas).toHaveLength(1);
  });

  it('acepta fechas en formato AAAA-MM-DD', () => {
    expect(limpiarPlan({ ...plan, fechaExamen: '2026-11-15' }, 2).fechaExamen).toBe('2026-11-15');
  });
});
