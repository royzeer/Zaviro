// Organiza un documento con la IA del servidor (Claude) cuando está disponible.
// Si no hay cuenta, no hay conexión o el servidor no tiene clave, la app sigue con sus reglas propias.
import {
  contarPalabras,
  normalizarPalabra,
  type DocumentoLeido,
  type Seccion,
} from '@/dominio/documentos';
import { api, obtenerToken } from '@/sincronizacion/cliente';

/** Lo que responde la API en /ia/plan. */
export interface PlanIa {
  materia: string;
  resumen: string;
  fechaExamen: string | null;
  temas: {
    titulo: string;
    secciones: number[];
    importancia: number;
    dificultad: 'baja' | 'media' | 'alta';
    resumen: string;
    tarjetas: { pregunta: string; respuesta: string }[];
  }[];
}

/** El análisis de un documento largo puede tardar unos minutos. */
const ESPERA_IA_MS = 5 * 60 * 1000;

let disponible: Promise<boolean> | null = null;

/** Hay sesión iniciada y el servidor tiene la IA configurada. Se pregunta una sola vez. */
export function iaDisponible(): Promise<boolean> {
  if (!obtenerToken()) return Promise.resolve(false);
  disponible ??= api
    .get<{ disponible: boolean }>('/ia/estado')
    .then((r) => r.disponible === true)
    .catch(() => {
      disponible = null;
      return false;
    });
  return disponible;
}

/**
 * Convierte la respuesta de la IA en un documento listo para importar. Cada tema guarda el
 * apunte de estudio de la IA y debajo el texto original de sus secciones, para no perder nada.
 * Las secciones que la IA no asignó a ningún tema quedan como temas propios.
 */
export function documentoDesdeIa(original: DocumentoLeido, plan: PlanIa): DocumentoLeido {
  const usadas = new Set<number>();
  const secciones: Seccion[] = plan.temas.map((t) => {
    const propias = t.secciones.filter((i) => original.secciones[i] && !usadas.has(i));
    propias.forEach((i) => usadas.add(i));
    const textoOriginal = propias
      .map((i) => original.secciones[i]!)
      .map((s) => (propias.length > 1 ? `### ${s.titulo}\n\n${s.contenido}` : s.contenido))
      .join('\n\n');
    const contenido = [t.resumen.trim(), textoOriginal && `## Del documento\n\n${textoOriginal}`]
      .filter(Boolean)
      .join('\n\n');
    return {
      titulo: t.titulo,
      nivel: 1,
      contenido,
      palabras: contarPalabras(contenido),
      importancia: t.importancia,
      dificultad: t.dificultad,
      tarjetas: t.tarjetas.map((c) => ({ frente: c.pregunta, reverso: c.respuesta })),
    };
  });
  original.secciones.forEach((s, i) => {
    if (usadas.has(i) || s.palabras === 0) return;
    // Si ya hay un tema con ese nombre, el texto se le agrega; si no, queda como tema aparte.
    const igual = secciones.find(
      (x) => normalizarPalabra(x.titulo) === normalizarPalabra(s.titulo),
    );
    if (igual) {
      igual.contenido += `\n\n${s.contenido}`;
      igual.palabras = contarPalabras(igual.contenido);
    } else secciones.push({ ...s, importancia: 3 });
  });
  return {
    titulo: plan.materia || original.titulo,
    secciones,
    palabras: original.palabras,
    organizadoPor: 'ia',
    resumen: plan.resumen,
  };
}

/** Pide a la IA que organice el documento. Lanza un error si no se pudo. */
export async function organizarConIa(
  documento: DocumentoLeido,
  archivo: string,
  nivel?: string,
): Promise<{ documento: DocumentoLeido; fechaExamen: string | null }> {
  const plan = await api.post<PlanIa>(
    '/ia/plan',
    {
      archivo,
      nivel,
      secciones: documento.secciones.map((s) => ({ titulo: s.titulo, contenido: s.contenido })),
    },
    ESPERA_IA_MS,
  );
  return { documento: documentoDesdeIa(documento, plan), fechaExamen: plan.fechaExamen };
}
