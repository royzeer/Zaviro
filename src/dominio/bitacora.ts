import { differenceInCalendarDays, parseISO, startOfDay, startOfWeek, subDays } from 'date-fns';

/** Bitácora de avances de investigación: resumen de constancia y horas. */

export interface EntradaBasica {
  fecha: string;
  horas?: number | undefined;
}

export interface ResumenBitacora {
  /** Horas registradas desde el lunes de esta semana. */
  horasSemana: number;
  /** Horas registradas en los últimos 30 días. */
  horas30: number;
  /** Días distintos con al menos una entrada en los últimos 30 días. */
  dias30: number;
  /** Días desde la última entrada (null si no hay ninguna). */
  diasSinRegistro: number | null;
}

export function resumenBitacora(entradas: EntradaBasica[], hoy = new Date()): ResumenBitacora {
  const dia = startOfDay(hoy);
  const lunes = startOfWeek(dia, { weekStartsOn: 1 });
  const hace30 = subDays(dia, 29);
  let horasSemana = 0;
  let horas30 = 0;
  const dias = new Set<string>();
  let ultima: Date | null = null;
  for (const e of entradas) {
    const f = startOfDay(parseISO(e.fecha));
    if (f > dia) continue;
    if (!ultima || f > ultima) ultima = f;
    if (f >= lunes) horasSemana += e.horas ?? 0;
    if (f >= hace30) {
      horas30 += e.horas ?? 0;
      dias.add(f.toISOString());
    }
  }
  return {
    horasSemana,
    horas30,
    dias30: dias.size,
    diasSinRegistro: ultima ? differenceInCalendarDays(dia, ultima) : null,
  };
}
