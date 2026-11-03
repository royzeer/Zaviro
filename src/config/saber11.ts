import type { PruebaSaber11 } from '@/dominio/catalogo';

/**
 * Configuración del examen Saber 11.
 *
 * VERIFICAR: estos pesos son los documentados públicamente para el cálculo del puntaje global
 * (3 para Lectura Crítica, Matemáticas, Sociales y Ciudadanas y Ciencias Naturales; 1 para Inglés,
 * divididos entre 13). Antes de confiar en ellos, compáralos con la resolución y la guía de
 * orientación vigentes del ICFES (https://www.icfes.gov.co). Si cambian, basta con editar este archivo.
 */
export const SABER11 = {
  /** Puntaje de cada prueba: de 0 a 100. */
  maximoPrueba: 100,
  /** El global es el promedio ponderado de las pruebas multiplicado por este factor (0 a 500). */
  factorGlobal: 5,
  pesos: {
    lecturaCritica: 3,
    matematicas: 3,
    socialesCiudadanas: 3,
    cienciasNaturales: 3,
    ingles: 1,
  } satisfies Record<PruebaSaber11, number>,
};

export const NOMBRE_PRUEBA: Record<PruebaSaber11, string> = {
  lecturaCritica: 'Lectura Crítica',
  matematicas: 'Matemáticas',
  socialesCiudadanas: 'Sociales y Ciudadanas',
  cienciasNaturales: 'Ciencias Naturales',
  ingles: 'Inglés',
};
