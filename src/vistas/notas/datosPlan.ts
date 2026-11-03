import { format, parseISO, subDays } from 'date-fns';
import { db } from '@/db/db';
import type { PerfilAcademico } from '@/db/esquemas';
import { materiasDePerfil, temasDeMaterias } from '@/db/operaciones';
import { obtenerAjuste } from '@/db/repositorio';
import { CONFIG_PLAN, generarPlan, type ConfigPlan } from '@/dominio/plan';
import { rendimientoDeEstudio } from '@/dominio/rendimiento';

export type PreferenciasPlan = Pick<ConfigPlan, 'horasPorDia' | 'diasLibres'>;

export const clavePlan = (perfilId: string) => `plan:${perfilId}`;

/** Días hacia atrás en los que las sesiones hechas cuentan como horas ya estudiadas. */
const DIAS_SESIONES = 21;

/** Carga lo necesario y calcula rendimiento y plan para un perfil. */
export async function cargarPlan(perfil: PerfilAcademico, ahora = new Date()) {
  const materias = await materiasDePerfil(perfil.id);
  const temas = await temasDeMaterias(materias.map((m) => m.id));
  const temaIds = new Set(temas.map((t) => t.id));
  const preferencias = {
    horasPorDia: CONFIG_PLAN.horasPorDia,
    diasLibres: CONFIG_PLAN.diasLibres,
    ...(await obtenerAjuste<PreferenciasPlan>(clavePlan(perfil.id))),
  };
  const desde = subDays(ahora, DIAS_SESIONES).toISOString();
  const sesiones = (await db.sesiones.where('fecha').above(desde).toArray()).filter((s) =>
    temaIds.has(s.temaId),
  );
  const horasEstudiadas = new Map<string, number>();
  for (const s of sesiones)
    horasEstudiadas.set(s.temaId, (horasEstudiadas.get(s.temaId) ?? 0) + s.horas);
  const tarjetas = await db.tarjetas.toArray();
  const repasosPorDia = new Map<string, number>();
  for (const t of tarjetas) {
    if (t.temaId && !temaIds.has(t.temaId)) continue;
    const k = format(parseISO(t.proximoRepaso), 'yyyy-MM-dd');
    repasosPorDia.set(k, (repasosPorDia.get(k) ?? 0) + 1);
  }
  const hoyClave = format(ahora, 'yyyy-MM-dd');
  const hechasHoy = sesiones.filter((s) => format(parseISO(s.fecha), 'yyyy-MM-dd') === hoyClave);
  const hechoHoy = new Map<string, number>();
  for (const s of hechasHoy) hechoHoy.set(s.temaId, (hechoHoy.get(s.temaId) ?? 0) + s.horas);
  const rendimiento = rendimientoDeEstudio(temas, materias, perfil.reglas);
  const plan = generarPlan({
    rendimiento,
    horasEstudiadas,
    hechoHoy,
    repasosPorDia,
    hoy: ahora,
    config: preferencias,
  });
  return { materias, temas, rendimiento, plan, preferencias };
}

export type DatosPlan = Awaited<ReturnType<typeof cargarPlan>>;
