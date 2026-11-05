// Organiza los apuntes de un documento con Claude: decide los temas, cuánto pesa cada uno,
// escribe un resumen de estudio por tema y crea preguntas de repaso. Si no hay clave
// (ANTHROPIC_API_KEY) la ruta responde que la IA no está disponible y la app usa su modo propio.
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import { env } from '../config/env';
import { AppError } from '../utils/respuesta';

/** Unos 100 000 tokens: suficiente para un libro de apuntes y con costo acotado. */
export const MAX_CARACTERES = 400_000;
export const MAX_SECCIONES = 300;

export const planIaEsquema = z.object({
  materia: z.string().describe('Nombre corto de la materia o asignatura'),
  resumen: z.string().describe('Una o dos frases sobre de qué tratan los apuntes'),
  fechaExamen: z
    .string()
    .nullable()
    .describe('Fecha del examen en formato AAAA-MM-DD solo si aparece en el texto; si no, null'),
  temas: z.array(
    z.object({
      titulo: z.string(),
      secciones: z
        .array(z.number())
        .describe('Índices de las secciones originales que cubre este tema'),
      importancia: z
        .number()
        .describe('Entero de 1 (poco) a 10 (clave para el examen): cuánto tiempo merece'),
      dificultad: z.enum(['baja', 'media', 'alta']),
      resumen: z
        .string()
        .describe('Apunte de estudio en Markdown: ideas clave, fórmulas y ejemplos breves'),
      tarjetas: z
        .array(z.object({ pregunta: z.string(), respuesta: z.string() }))
        .describe('De 2 a 6 preguntas de repaso con su respuesta corta'),
    }),
  ),
});

export type PlanIa = z.infer<typeof planIaEsquema>;

export interface SeccionEntrada {
  titulo: string;
  contenido: string;
}

const SISTEMA = `Eres el organizador de estudio de Zaviro, una app para estudiantes en Colombia.
Recibes los apuntes de un estudiante ya divididos en secciones numeradas. Tu trabajo es convertirlos en un plan de estudio listo para usar, sin pedirle nada al estudiante.

- Agrupa las secciones en temas de estudio con sentido (normalmente entre 3 y 12). Une secciones muy cortas o repetidas y divide solo si una sección mezcla temas claramente distintos. Cada sección debe quedar en al menos un tema.
- Usa títulos claros en español, sin numeración.
- La importancia refleja cuánto pesa el tema para entender la materia y para el examen, no solo lo largo que es.
- El resumen de cada tema es un apunte de estudio en Markdown, fiel al documento: ideas clave, definiciones, fórmulas y un ejemplo si ayuda. No inventes datos que no estén en los apuntes.
- Las tarjetas son preguntas de repaso que se responden en una o dos frases, basadas en el contenido.
- Responde en español de Colombia, con lenguaje sencillo.`;

let cliente: Anthropic | null = null;
function clienteIa(): Anthropic {
  cliente ??= new Anthropic({ apiKey: env.ia.clave, timeout: 4 * 60 * 1000, maxRetries: 1 });
  return cliente;
}

export const iaDisponible = () => env.ia.clave.length > 0;

/** Valida lo que llega del navegador y arma el texto que lee la IA. */
export function prepararEntrada(cuerpo: unknown): {
  archivo: string;
  nivel: string;
  secciones: SeccionEntrada[];
} {
  const datos = (cuerpo ?? {}) as Record<string, unknown>;
  const crudas = Array.isArray(datos.secciones) ? datos.secciones : [];
  const secciones = crudas
    .map((s) => s as Record<string, unknown>)
    .map((s) => ({
      titulo: typeof s.titulo === 'string' ? s.titulo.slice(0, 200) : '',
      contenido: typeof s.contenido === 'string' ? s.contenido : '',
    }))
    .filter((s) => s.contenido.trim() || s.titulo.trim());
  if (secciones.length === 0) throw new AppError('El documento no tiene texto para analizar', 422);
  if (secciones.length > MAX_SECCIONES)
    throw new AppError('El documento tiene demasiadas secciones para la IA', 413);
  const total = secciones.reduce((n, s) => n + s.contenido.length + s.titulo.length, 0);
  if (total > MAX_CARACTERES)
    throw new AppError('El documento es demasiado largo para analizarlo con IA', 413);
  return {
    archivo: typeof datos.archivo === 'string' ? datos.archivo.slice(0, 200) : 'Documento',
    nivel: typeof datos.nivel === 'string' ? datos.nivel.slice(0, 40) : '',
    secciones,
  };
}

export function textoParaIa(entrada: ReturnType<typeof prepararEntrada>, hoy: Date): string {
  const partes = entrada.secciones.map(
    (s, i) =>
      `<seccion indice="${i}" titulo="${s.titulo.replace(/"/g, "'")}">\n${s.contenido}\n</seccion>`,
  );
  const encabezado = [`Archivo: ${entrada.archivo}`];
  if (entrada.nivel) encabezado.push(`Nivel del estudiante: ${entrada.nivel}`);
  encabezado.push(`Fecha de hoy: ${hoy.toISOString().slice(0, 10)}`);
  return [...encabezado, '', '<apuntes>', ...partes, '</apuntes>'].join('\n');
}

/** Corrige lo que la IA devuelva fuera de rango para que la app nunca reciba datos rotos. */
export function limpiarPlan(plan: PlanIa, cantidadSecciones: number): PlanIa {
  const fecha =
    plan.fechaExamen && /^\d{4}-\d{2}-\d{2}$/.test(plan.fechaExamen) ? plan.fechaExamen : null;
  const temas = plan.temas
    .map((t) => ({
      ...t,
      titulo: t.titulo.trim().slice(0, 120),
      secciones: [...new Set(t.secciones)].filter(
        (i) => Number.isInteger(i) && i >= 0 && i < cantidadSecciones,
      ),
      importancia: Math.min(10, Math.max(1, Math.round(t.importancia) || 5)),
      tarjetas: t.tarjetas
        .filter((c) => c.pregunta.trim() && c.respuesta.trim())
        .slice(0, 8)
        .map((c) => ({ pregunta: c.pregunta.trim(), respuesta: c.respuesta.trim() })),
    }))
    .filter((t) => t.titulo);
  return { ...plan, materia: plan.materia.trim().slice(0, 80), fechaExamen: fecha, temas };
}

export async function organizarApuntes(cuerpo: unknown, hoy = new Date()): Promise<PlanIa> {
  if (!iaDisponible()) throw new AppError('La IA no está configurada en el servidor', 503);
  const entrada = prepararEntrada(cuerpo);
  let mensaje;
  try {
    const flujo = clienteIa().beta.messages.stream({
      model: env.ia.modelo,
      max_tokens: 64000,
      // Si el modelo declina por precaución, el servidor de Anthropic reintenta con otro modelo.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      thinking: { type: 'adaptive' },
      output_config: { effort: 'medium', format: betaZodOutputFormat(planIaEsquema) },
      system: SISTEMA,
      messages: [{ role: 'user', content: textoParaIa(entrada, hoy) }],
    });
    mensaje = await flujo.finalMessage();
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError)
      throw new AppError('La clave de la IA no es válida', 503);
    if (error instanceof Anthropic.RateLimitError)
      throw new AppError('La IA está ocupada. Intenta en un momento.', 503);
    if (error instanceof Anthropic.APIError) {
      if (env.entorno !== 'test') console.error('Error de la IA:', error.status, error.message);
      throw new AppError('La IA no pudo analizar el documento', 502);
    }
    throw error;
  }
  if (mensaje.stop_reason === 'refusal' || !mensaje.parsed_output)
    throw new AppError('La IA no pudo analizar el documento', 502);
  const plan = limpiarPlan(mensaje.parsed_output, entrada.secciones.length);
  if (plan.temas.length === 0) throw new AppError('La IA no encontró temas en el documento', 502);
  return plan;
}
