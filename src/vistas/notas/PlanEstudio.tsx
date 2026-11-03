import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useState } from 'react';
import type { PerfilAcademico } from '@/db/esquemas';
import { ahoraIso, guardar, guardarAjuste, nuevoId } from '@/db/repositorio';
import { Interruptor, NumeroEntrada } from '@/componentes/Formulario';
import { EstadoVacio, Tarjeta } from '@/componentes/Tarjeta';
import { clavePlan, type DatosPlan } from './datosPlan';
import { duracion } from '@/utilidades/numeros';

const DIAS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
const NOMBRE_DIA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

export function PlanEstudio({ perfil, datos }: { perfil: PerfilAcademico; datos: DatosPlan }) {
  const [verTodo, setVerTodo] = useState(false);
  const { plan, preferencias } = datos;
  const tema = new Map(datos.temas.map((t) => [t.id, t]));
  const materia = new Map(datos.materias.map((m) => [m.id, m]));
  const dias = verTodo ? plan.dias : plan.dias.slice(0, 7);

  const guardarPref = (p: Partial<typeof preferencias>) =>
    void guardarAjuste(clavePlan(perfil.id), { ...preferencias, ...p });

  async function marcarHecho(temaId: string, horas: number) {
    await guardar('sesiones', { id: nuevoId(), temaId, fecha: ahoraIso(), horas });
  }

  return (
    <Tarjeta titulo="Plan de estudio" icono="calendario">
      <p className="mb-4 text-xs text-tinta-suave">
        Se arma desde hoy hasta tu último examen: primero el tiempo de repaso y luego los temas que
        más rinden por hora, subiendo los de materias con examen cercano y mucho por estudiar.
        Cuando marcas un bloque como hecho, se descuenta; si te atrasas, el plan se reacomoda solo.
      </p>
      <div className="mb-4 flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="etiqueta mb-0">Horas por día</span>
          <NumeroEntrada
            valor={preferencias.horasPorDia}
            min={0.5}
            max={16}
            onCambio={(v) => v !== null && v >= 0.5 && v <= 16 && guardarPref({ horasPorDia: v })}
            className="w-24"
            aria-label="Horas de estudio por día"
          />
        </label>
        <fieldset>
          <legend className="etiqueta">Días sin estudio</legend>
          <div className="flex gap-1">
            {DIAS.map((d, i) => {
              const libre = preferencias.diasLibres.includes(i);
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={libre}
                  aria-label={`${NOMBRE_DIA[i]}${libre ? ', sin estudio' : ''}`}
                  onClick={() =>
                    guardarPref({
                      diasLibres: libre
                        ? preferencias.diasLibres.filter((x) => x !== i)
                        : [...preferencias.diasLibres, i],
                    })
                  }
                  className={`h-9 w-9 rounded-lg border text-sm font-bold ${libre ? 'border-primario bg-primario text-sobre-primario' : 'border-linea bg-superficie'}`}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </fieldset>
      </div>

      {plan.faltantes.length > 0 && (
        <div className="mb-4 rounded-xl bg-peligro/10 p-3 text-sm text-peligro" role="alert">
          {plan.faltantes.map((f) => (
            <p key={f.materiaId}>
              {`No alcanzan las horas para ${materia.get(f.materiaId)?.nombre ?? 'una materia'}: faltan ${duracion(f.horas)} antes del examen. Sube las horas por día o empieza por los temas de arriba.`}
            </p>
          ))}
        </div>
      )}

      {plan.dias.every((d) => d.bloques.length === 0 && d.minutosRepaso === 0) ? (
        <EstadoVacio texto="No hay nada que planear todavía. Agrega temas y la fecha de tus exámenes." />
      ) : (
        <ol className="flex flex-col gap-3">
          {dias.map((d, i) => (
            <li
              key={d.fecha}
              className={`rounded-2xl border p-3 ${i === 0 ? 'border-primario/50 bg-superficie-2/40' : 'border-linea/70'}`}
            >
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <p className="text-sm font-bold first-letter:uppercase">
                  {i === 0 ? 'Hoy' : format(parseISO(d.fecha), "EEEE d 'de' MMM", { locale: es })}
                </p>
                {d.examenes.map((m) => (
                  <span key={m} className="chip bg-peligro/10 text-peligro">
                    Examen de {materia.get(m)?.nombre}
                  </span>
                ))}
                {d.libre && <span className="chip">Día libre</span>}
                {d.minutosRepaso > 0 && <span className="chip">Repaso {d.minutosRepaso} min</span>}
              </div>
              {d.bloques.length === 0 ? (
                !d.libre &&
                d.examenes.length === 0 && (
                  <p className="text-xs text-tinta-suave">Sin bloques de estudio.</p>
                )
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {d.bloques.map((b) => {
                    const t = tema.get(b.temaId);
                    const m = materia.get(b.materiaId);
                    const hecho = b.hecho === true;
                    return (
                      <li
                        key={`${b.temaId}${hecho ? '-hecho' : ''}`}
                        className="flex items-center gap-3 text-sm"
                      >
                        <span
                          className="h-6 w-1 rounded-full"
                          style={{ backgroundColor: m?.color }}
                        />
                        <span className="min-w-0 flex-1">
                          <span
                            className={`font-semibold ${hecho ? 'text-tinta-suave line-through' : ''}`}
                          >
                            {t?.titulo}
                          </span>
                          <span className="text-xs text-tinta-suave"> · {m?.nombre}</span>
                        </span>
                        <span className="tabular-nums text-tinta-suave">{duracion(b.horas)}</span>
                        {i === 0 && !hecho && (
                          <button
                            type="button"
                            className="boton-secundario px-3 py-1 text-xs"
                            onClick={() => void marcarHecho(b.temaId, b.horas)}
                          >
                            Hecho
                          </button>
                        )}
                        {hecho && <span className="chip bg-exito/15 text-exito">Hecho</span>}
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          ))}
        </ol>
      )}
      {plan.dias.length > 7 && (
        <div className="mt-3">
          <Interruptor etiqueta="Ver todo el plan" activo={verTodo} onCambio={setVerTodo} />
        </div>
      )}
    </Tarjeta>
  );
}
