import { describe, expect, it } from 'vitest';
import { pesosDeSecciones, tarjetasDeSeccion, type DocumentoLeido } from '@/dominio/documentos';
import { documentoDesdeIa, type PlanIa } from './ia';

const original: DocumentoLeido = {
  titulo: 'apuntes fisica',
  palabras: 30,
  secciones: [
    {
      titulo: 'Vectores',
      nivel: 1,
      contenido: 'Un vector tiene magnitud y dirección.',
      palabras: 6,
    },
    {
      titulo: 'Suma de vectores',
      nivel: 1,
      contenido: 'Se suman componente a componente.',
      palabras: 5,
    },
    {
      titulo: 'Fuerzas',
      nivel: 1,
      contenido: 'La fuerza neta es masa por aceleración.',
      palabras: 7,
    },
    { titulo: 'Anexo', nivel: 1, contenido: 'Tabla de constantes físicas útiles.', palabras: 5 },
  ],
};

const plan: PlanIa = {
  materia: 'Física I',
  resumen: 'Mecánica básica',
  fechaExamen: null,
  temas: [
    {
      titulo: 'Vectores',
      secciones: [0, 1],
      importancia: 8,
      dificultad: 'media',
      resumen: '- Magnitud y dirección',
      tarjetas: [{ pregunta: '¿Cómo se suman dos vectores?', respuesta: 'Por componentes.' }],
    },
    {
      titulo: 'Leyes de Newton',
      secciones: [2, 0],
      importancia: 10,
      dificultad: 'alta',
      resumen: '- F = m·a',
      tarjetas: [],
    },
  ],
};

describe('Documento organizado por la IA', () => {
  const doc = documentoDesdeIa(original, plan);

  it('usa los temas y el nombre de materia de la IA y conserva el texto original', () => {
    expect(doc.organizadoPor).toBe('ia');
    expect(doc.titulo).toBe('Física I');
    expect(doc.secciones.map((s) => s.titulo)).toEqual(['Vectores', 'Leyes de Newton', 'Anexo']);
    expect(doc.secciones[0]!.contenido).toContain('- Magnitud y dirección');
    expect(doc.secciones[0]!.contenido).toContain('### Suma de vectores');
    // La sección 0 ya estaba en "Vectores": no se repite en el segundo tema.
    expect(doc.secciones[1]!.contenido).not.toContain('magnitud y dirección');
  });

  it('reparte el peso por importancia y usa las preguntas de la IA', () => {
    const pesos = pesosDeSecciones(doc.secciones);
    expect(pesos.reduce((a, b) => a + b, 0)).toBe(100);
    expect(pesos[1]).toBeGreaterThan(pesos[0]!);
    expect(pesos[0]).toBeGreaterThan(pesos[2]!);
    expect(tarjetasDeSeccion(doc.secciones[0]!)).toEqual([
      { frente: '¿Cómo se suman dos vectores?', reverso: 'Por componentes.' },
    ]);
  });
});
