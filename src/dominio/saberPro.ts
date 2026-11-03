/**
 * Preparación Saber Pro / Saber TyT. La app no fija escalas oficiales que no se puedan verificar:
 * cada práctica se guarda como aciertos sobre preguntas y se compara en porcentaje. Los módulos
 * (genéricos y específicos) los define el estudiante; los genéricos sugeridos son solo nombres
 * para empezar y se pueden borrar o renombrar.
 */

export const GENERICOS_SUGERIDOS = [
  'Lectura crítica',
  'Razonamiento cuantitativo',
  'Competencias ciudadanas',
  'Comunicación escrita',
  'Inglés',
];

export interface ModuloBasico {
  id: string;
  nombre: string;
  tipo: 'generico' | 'especifico';
}

export interface PracticaBasica {
  moduloId: string;
  fecha: string;
  aciertos: number;
  preguntas: number;
}

export interface ResumenModulo {
  modulo: ModuloBasico;
  practicas: number;
  /** Porcentaje de aciertos en las últimas prácticas (null si no hay). */
  porcentaje: number | null;
  /** Cambio en puntos porcentuales entre la primera y la última de esas prácticas. */
  tendencia: number;
  ultima?: string;
}

/**
 * Resume cada módulo con las últimas `ventana` prácticas (sumando aciertos y preguntas, así una
 * práctica larga pesa más que una corta) y los ordena para reforzar: primero los que no tienen
 * prácticas, luego de menor a mayor porcentaje; en empate, el que viene bajando.
 */
export function resumenSaberPro(
  modulos: ModuloBasico[],
  practicas: PracticaBasica[],
  ventana = 3,
): ResumenModulo[] {
  const resumen = modulos.map((modulo) => {
    const propias = practicas
      .filter((p) => p.moduloId === modulo.id && p.preguntas > 0)
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
    const recientes = propias.slice(-ventana);
    const aciertos = recientes.reduce((s, p) => s + Math.min(p.aciertos, p.preguntas), 0);
    const preguntas = recientes.reduce((s, p) => s + p.preguntas, 0);
    const pct = (p: PracticaBasica) => (Math.min(p.aciertos, p.preguntas) / p.preguntas) * 100;
    const r: ResumenModulo = {
      modulo,
      practicas: propias.length,
      porcentaje: preguntas > 0 ? (aciertos / preguntas) * 100 : null,
      tendencia:
        recientes.length > 1 ? pct(recientes[recientes.length - 1]!) - pct(recientes[0]!) : 0,
    };
    if (propias.length > 0) r.ultima = propias[propias.length - 1]!.fecha;
    return r;
  });
  return resumen.sort((a, b) => {
    if (a.porcentaje === null || b.porcentaje === null)
      return (a.porcentaje === null ? -1 : 0) - (b.porcentaje === null ? -1 : 0);
    return a.porcentaje - b.porcentaje || a.tendencia - b.tendencia;
  });
}
