import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { hrefDe } from '@/app/enrutador';
import type { HitoTrabajoGrado, Materia, PerfilAcademico } from '@/db/esquemas';
import { Tarjeta } from '@/componentes/Tarjeta';
import { calendarioPorMes, hitoCumplido, resumenHitos } from '@/dominio/hitos';
import { resumenPromedio } from '@/dominio/notas';
import { distanciaDias, fechaCorta, formatoNota } from '@/utilidades/fechas';

export function Resumen({ hitos }: { hitos: HitoTrabajoGrado[] }) {
  const r = resumenHitos(hitos);
  return (
    <Tarjeta titulo="Cómo vas" icono="notas">
      <div className="flex items-baseline justify-between">
        <p className="text-3xl font-extrabold tabular-nums">{Math.round(r.progreso * 100)}%</p>
        <p className="text-xs font-semibold text-tinta-suave">
          {r.cumplidos} de {r.total} hitos entregados o aprobados
        </p>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-superficie-2" role="presentation">
        <div className="h-full rounded-full bg-exito" style={{ width: `${r.progreso * 100}%` }} />
      </div>
      <p className="mt-2 text-xs text-tinta-suave">
        Un hito aprobado cuenta completo; uno entregado cuenta la mitad mientras lo aprueban.
      </p>
      {r.proximo && (
        <div className="mt-4 rounded-xl bg-superficie-2/70 px-3 py-2.5">
          <p className="text-xs font-semibold text-tinta-suave">Próxima entrega</p>
          <p className="font-bold">{r.proximo.titulo}</p>
          <p className="text-xs text-tinta-suave">
            {fechaCorta(r.proximo.fecha!)} · {distanciaDias(r.proximo.fecha!)}
          </p>
        </div>
      )}
      {r.atrasados.length > 0 && (
        <p role="alert" className="mt-3 rounded-xl bg-peligro/10 px-3 py-2.5 text-sm text-peligro">
          {r.atrasados.length === 1
            ? 'Tienes un hito atrasado: '
            : `Tienes ${r.atrasados.length} hitos atrasados: `}
          {r.atrasados.map((h) => h.titulo).join(', ')}. Ponle una fecha nueva o márcalo como
          entregado.
        </p>
      )}
    </Tarjeta>
  );
}

export function Calendario({ hitos }: { hitos: HitoTrabajoGrado[] }) {
  const meses = calendarioPorMes(hitos);
  if (meses.length === 0) return null;
  return (
    <Tarjeta titulo="Calendario de entregas" icono="calendario">
      <ol className="flex flex-col gap-4">
        {meses.map((m) => (
          <li key={m.mes ?? 'sin-fecha'}>
            <p className="etiqueta first-letter:uppercase">
              {m.mes ? format(parseISO(`${m.mes}-01`), 'MMMM yyyy', { locale: es }) : 'Sin fecha'}
            </p>
            <ul className="flex flex-col gap-1.5">
              {m.items.map((h) => (
                <li key={h.id} className="flex items-center gap-3 text-sm">
                  <span className="w-12 shrink-0 text-xs font-semibold tabular-nums text-tinta-suave">
                    {h.fecha ? format(parseISO(h.fecha), 'd MMM', { locale: es }) : '--'}
                  </span>
                  <span
                    className={`flex-1 ${hitoCumplido(h) ? 'text-tinta-suave line-through' : 'font-semibold'}`}
                  >
                    {h.titulo}
                  </span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </Tarjeta>
  );
}

export function ReglaPromedio({
  perfil,
  materias,
}: {
  perfil: PerfilAcademico;
  materias: Materia[];
}) {
  const { promedio, escala, usaNotas } = perfil.reglas;
  if (!usaNotas) return null;
  const acumulado = resumenPromedio(materias, perfil.reglas).acumulado;
  const minimo = promedio.promedioAcumuladoMinimo;
  const dec = escala.decimales;
  return (
    <Tarjeta titulo="Regla de promedio" icono="notas" verTodo="/notas">
      <dl className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-superficie-2 px-3 py-2.5">
          <dt className="text-xs font-semibold text-tinta-suave">Nota mínima por curso</dt>
          <dd className="text-xl font-extrabold tabular-nums">
            {formatoNota(promedio.notaMinimaMateria, dec)}
          </dd>
        </div>
        <div className="rounded-xl bg-superficie-2 px-3 py-2.5">
          <dt className="text-xs font-semibold text-tinta-suave">Acumulado mínimo</dt>
          <dd className="text-xl font-extrabold tabular-nums">
            {minimo === null ? '--' : formatoNota(minimo, dec)}
          </dd>
        </div>
        <div className="rounded-xl bg-superficie-2 px-3 py-2.5">
          <dt className="text-xs font-semibold text-tinta-suave">Tu acumulado</dt>
          <dd
            className={`text-xl font-extrabold tabular-nums ${
              acumulado !== null && minimo !== null && acumulado < minimo ? 'text-peligro' : ''
            }`}
          >
            {acumulado === null ? '--' : formatoNota(acumulado, dec)}
          </dd>
        </div>
      </dl>
      <p className="mt-3 text-xs text-tinta-suave">
        En muchos posgrados no puedes graduarte ni sustentar si el acumulado queda por debajo del
        mínimo. Ese valor cambia entre universidades: confírmalo en tu reglamento y ajústalo en{' '}
        <a href={hrefDe('/perfil')} className="font-semibold underline">
          las reglas de tu perfil
        </a>
        .
      </p>
    </Tarjeta>
  );
}
