import type { Area } from '../catalogo';
import { dosCables, planoInclinado } from './mecanica';
import { busquedaBinaria, dilucion, dosisPorPeso, elasticidad, proporcion } from './otrasAreas';
import type { Generador } from './tipos';

export * from './tipos';

/** Ejemplos que se resuelven solos con los datos que elija el estudiante. */
export const GENERADORES: Generador[] = [
  planoInclinado,
  dosCables,
  dilucion,
  busquedaBinaria,
  dosisPorPeso,
  elasticidad,
  proporcion,
];

export function buscarGenerador(id: string): Generador | undefined {
  return GENERADORES.find((g) => g.id === id);
}

/** Primero los del área del perfil, luego los demás. */
export function generadoresPorArea(area: Area): { propios: Generador[]; otros: Generador[] } {
  return {
    propios: GENERADORES.filter((g) => g.areas.includes(area)),
    otros: GENERADORES.filter((g) => !g.areas.includes(area)),
  };
}
