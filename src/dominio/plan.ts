import { addDays, differenceInCalendarDays, format, parseISO, startOfDay } from 'date-fns';
import type { RendimientoTema } from './rendimiento';

/**
 * Plan de estudio. Reparte las horas pendientes de cada tema entre hoy y la fecha de su examen,
 * priorizando el mayor rendimiento (puntos por hora) ajustado por urgencia, y reserva primero el
 * tiempo de los repasos. La urgencia de una materia es lo que le falta dividido entre las horas que
 * le quedarían antes del examen si hoy no la estudias (con tope 3): una materia apretada sube en la
 * lista aunque rinda menos por hora.
 * El plan se calcula siempre desde hoy con lo que falta: si te atrasas, se reajusta solo.
 */

export interface ConfigPlan {
  horasPorDia: number;
  /** Días de la semana sin estudio (0 = domingo … 6 = sábado). */
  diasLibres: number[];
  /** Minutos que toma en promedio repasar una tarjeta. */
  minutosPorTarjeta: number;
  /** Tamaño de cada bloque de estudio, en horas. */
  bloque: number;
  /** Máximo de horas para un mismo tema en un día (para no saturarse). */
  maximoPorTemaDia: number;
  /** Días a planear si ninguna materia tiene fecha de examen. */
  horizonteSinFechas: number;
}

export const CONFIG_PLAN: ConfigPlan = {
  horasPorDia: 2,
  diasLibres: [],
  minutosPorTarjeta: 1.5,
  bloque: 0.5,
  maximoPorTemaDia: 2,
  horizonteSinFechas: 7,
};

export interface BloquePlan {
  temaId: string;
  materiaId: string;
  horas: number;
  /** Bloque que ya se marcó como hecho hoy. */
  hecho?: boolean;
}

export interface DiaPlan {
  fecha: string; // aaaa-mm-dd
  libre: boolean;
  minutosRepaso: number;
  bloques: BloquePlan[];
  horasLibres: number;
  /** Materias con examen ese día. */
  examenes: string[];
}

export interface Faltante {
  materiaId: string;
  horas: number;
}

export interface Plan {
  dias: DiaPlan[];
  /** Horas que no alcanzan a caber antes del examen de cada materia. */
  faltantes: Faltante[];
}

const clave = (d: Date) => format(d, 'yyyy-MM-dd');

/** Horas de estudio disponibles desde `desde` (incluido) hasta `hasta` (excluido). */
export function capacidadEntre(desde: Date, hasta: Date, c: ConfigPlan): number {
  let horas = 0;
  for (let d = startOfDay(desde); d < hasta; d = addDays(d, 1))
    if (!c.diasLibres.includes(d.getDay())) horas += c.horasPorDia;
  return horas;
}

export function generarPlan(params: {
  rendimiento: RendimientoTema[];
  /** Horas ya estudiadas por tema (se descuentan de lo pendiente). */
  horasEstudiadas?: Map<string, number>;
  /** Horas ya hechas hoy por tema: ocupan la capacidad de hoy y se muestran como hechas. */
  hechoHoy?: Map<string, number>;
  /** Tarjetas que vencen cada día (aaaa-mm-dd). Las vencidas antes de hoy cuentan para hoy. */
  repasosPorDia?: Map<string, number>;
  hoy?: Date;
  config?: Partial<ConfigPlan>;
}): Plan {
  const c = { ...CONFIG_PLAN, ...params.config };
  const hoy = startOfDay(params.hoy ?? new Date());
  const estudiadas = params.horasEstudiadas ?? new Map<string, number>();
  const repasos = params.repasosPorDia ?? new Map<string, number>();

  const pendientes = new Map<string, number>();
  for (const r of params.rendimiento) {
    const falta = Math.max(0, r.horasPendientes - (estudiadas.get(r.tema.id) ?? 0));
    if (falta > 0) pendientes.set(r.tema.id, Math.round(falta * 10) / 10);
  }

  const examen = (r: RendimientoTema) =>
    r.materia.fechaParcial ? startOfDay(parseISO(r.materia.fechaParcial)) : null;
  const fechas = params.rendimiento.map(examen).filter((d): d is Date => d !== null && d > hoy);
  const ultimo = fechas.length
    ? Math.max(...fechas.map((d) => differenceInCalendarDays(d, hoy)))
    : c.horizonteSinFechas;
  // Incluye el día del último examen para mostrarlo en el calendario.
  const totalDias = Math.min(60, Math.max(1, fechas.length ? ultimo + 1 : ultimo));

  const examenesPorDia = new Map<string, string[]>();
  for (const r of params.rendimiento) {
    const d = examen(r);
    if (d)
      examenesPorDia.set(clave(d), [
        ...new Set([...(examenesPorDia.get(clave(d)) ?? []), r.materia.id]),
      ]);
  }

  const dias: DiaPlan[] = [];
  for (let i = 0; i < totalDias; i++) {
    const dia = addDays(hoy, i);
    const k = clave(dia);
    const libre = c.diasLibres.includes(dia.getDay());
    let tarjetas = repasos.get(k) ?? 0;
    if (i === 0) for (const [f, n] of repasos) if (f < k) tarjetas += n;
    const minutosRepaso = tarjetas > 0 ? Math.ceil((tarjetas * c.minutosPorTarjeta) / 5) * 5 : 0;
    let capacidad = libre ? 0 : Math.max(0, c.horasPorDia - minutosRepaso / 60);
    const bloques: BloquePlan[] = [];
    const hoyPorTema = new Map<string, number>();
    if (i === 0)
      for (const [temaId, horas] of params.hechoHoy ?? []) {
        const r = params.rendimiento.find((x) => x.tema.id === temaId);
        if (!r || horas <= 0) continue;
        bloques.push({ temaId, materiaId: r.materia.id, horas, hecho: true });
        hoyPorTema.set(temaId, horas);
        capacidad = Math.max(0, Math.round((capacidad - horas) * 100) / 100);
      }

    // Candidatos: temas con horas pendientes cuyo examen todavía no ha pasado (se estudia antes del día del examen).
    const vivos = params.rendimiento.filter((r) => {
      const e = examen(r);
      return (pendientes.get(r.tema.id) ?? 0) > 0 && (!e || dia < e);
    });
    const urgencia = new Map<string, number>();
    for (const r of vivos) {
      if (urgencia.has(r.materia.id)) continue;
      const e = examen(r);
      if (!e) {
        urgencia.set(r.materia.id, 0);
        continue;
      }
      const falta = vivos
        .filter((o) => o.materia.id === r.materia.id)
        .reduce((s, o) => s + (pendientes.get(o.tema.id) ?? 0), 0);
      // Horas que quedarían si hoy no se estudia esta materia.
      const disponibles = capacidadEntre(addDays(dia, 1), e, c);
      urgencia.set(r.materia.id, disponibles > 0 ? Math.min(3, falta / disponibles) : 3);
    }
    const puntaje = (r: RendimientoTema) =>
      r.puntosPorHora * (1 + (urgencia.get(r.materia.id) ?? 0));
    const candidatos = vivos.sort((a, b) => {
      const d = puntaje(b) - puntaje(a);
      if (Math.abs(d) > 1e-9) return d;
      const ea = examen(a)?.getTime() ?? Infinity;
      const eb = examen(b)?.getTime() ?? Infinity;
      return ea - eb;
    });

    for (const r of candidatos) {
      while (capacidad >= c.bloque - 1e-9) {
        const falta = pendientes.get(r.tema.id) ?? 0;
        const usado = hoyPorTema.get(r.tema.id) ?? 0;
        const cupo = Math.min(falta, capacidad, c.maximoPorTemaDia - usado);
        if (cupo < 0.25) break;
        const horas = Math.min(cupo, c.bloque * Math.ceil(cupo / c.bloque));
        const asignado = Math.round(Math.min(horas, cupo) * 100) / 100;
        pendientes.set(r.tema.id, Math.round((falta - asignado) * 100) / 100);
        hoyPorTema.set(r.tema.id, usado + asignado);
        capacidad = Math.round((capacidad - asignado) * 100) / 100;
        const existente = bloques.find((b) => b.temaId === r.tema.id && !b.hecho);
        if (existente) existente.horas = Math.round((existente.horas + asignado) * 100) / 100;
        else bloques.push({ temaId: r.tema.id, materiaId: r.materia.id, horas: asignado });
      }
      if (capacidad < c.bloque - 1e-9) break;
    }

    dias.push({
      fecha: k,
      libre,
      minutosRepaso,
      bloques,
      horasLibres: capacidad,
      examenes: examenesPorDia.get(k) ?? [],
    });
  }

  const faltantesPorMateria = new Map<string, number>();
  for (const r of params.rendimiento) {
    if (!examen(r)) continue;
    const falta = pendientes.get(r.tema.id) ?? 0;
    if (falta > 0)
      faltantesPorMateria.set(r.materia.id, (faltantesPorMateria.get(r.materia.id) ?? 0) + falta);
  }
  const faltantes = [...faltantesPorMateria]
    .map(([materiaId, horas]) => ({ materiaId, horas: Math.round(horas * 10) / 10 }))
    .filter((f) => f.horas > 0);
  return { dias, faltantes };
}
