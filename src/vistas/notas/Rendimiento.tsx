import type { RendimientoTema } from '@/dominio/rendimiento';
import { EstadoVacio, Tarjeta } from '@/componentes/Tarjeta';

const fmt = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');

export function Rendimiento({
  rendimiento,
  creditos,
}: {
  rendimiento: RendimientoTema[];
  creditos: boolean;
}) {
  const max = rendimiento[0]?.puntosPorHora || 1;
  return (
    <Tarjeta titulo="Dónde rinde más tu hora" icono="raiz">
      <p className="mb-4 text-xs text-tinta-suave">
        Puntos ganables por hora = peso del tema en el examen × lo que te falta dominar ÷ horas
        estimadas.{' '}
        {creditos
          ? 'Las horas salen de los créditos de cada materia y del peso del próximo corte.'
          : 'Las horas se estiman por el peso del tema.'}
      </p>
      {rendimiento.length === 0 ? (
        <EstadoVacio texto="Agrega temas con su peso en el examen para ver dónde conviene estudiar." />
      ) : (
        <ol className="flex flex-col gap-2">
          {rendimiento.slice(0, 8).map((r, i) => (
            <li
              key={r.tema.id}
              className="grid grid-cols-[1.5rem_1fr_auto] items-center gap-3 rounded-xl px-2 py-2 hover:bg-superficie-2/60"
            >
              <span className="text-sm font-extrabold tabular-nums text-tinta-suave">{i + 1}</span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{r.tema.titulo}</p>
                <p className="flex items-center gap-1.5 truncate text-xs text-tinta-suave">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: r.materia.color }}
                  />
                  {r.materia.nombre} · dominio {Math.round(r.tema.dominio * 100)}% · faltan{' '}
                  {fmt(r.horasPendientes)} h
                </p>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-superficie-2">
                  <div
                    className="h-full rounded-full bg-oxido"
                    style={{ width: `${(r.puntosPorHora / max) * 100}%` }}
                  />
                </div>
              </div>
              <p className="text-right text-sm font-extrabold tabular-nums">
                {fmt(r.puntosPorHora)}
                <span className="block text-[10px] font-semibold text-tinta-suave">pts/h</span>
              </p>
            </li>
          ))}
        </ol>
      )}
    </Tarjeta>
  );
}
