import { NOMBRE_PRUEBA } from '@/config/saber11';
import { EstadoVacio, Tarjeta } from '@/componentes/Tarjeta';
import type { PrioridadPrueba } from '@/dominio/saber11';

const uno = (n: number) => (Math.round(n * 10) / 10).toString().replace('.', ',');

export function Reforzar({
  prioridades,
  ventana,
}: {
  prioridades: PrioridadPrueba[];
  ventana: number;
}) {
  return (
    <Tarjeta titulo="Qué reforzar primero" icono="errores">
      {prioridades.length === 0 ? (
        <EstadoVacio texto="Registra un simulacro para saber qué prueba te da más puntos si la refuerzas." />
      ) : (
        <>
          <p className="mb-3 text-sm text-tinta-suave">
            Se ordena por los puntos de global que quedan por ganar en cada prueba, con el promedio
            de tus últimos {ventana} simulacros. Inglés pesa menos, así que solo sube si va muy por
            debajo de las demás.
          </p>
          <ol className="flex flex-col gap-2">
            {prioridades.map((p, i) => (
              <li
                key={p.prueba}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${i === 0 ? 'bg-brillo/15' : 'bg-superficie-2/70'}`}
              >
                <span className="text-sm font-extrabold tabular-nums text-tinta-suave">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold">{NOMBRE_PRUEBA[p.prueba]}</span>
                  <span className="block text-xs text-tinta-suave">
                    Promedio {uno(p.promedio)}
                    {p.tendencia !== 0 &&
                      ` · ${p.tendencia > 0 ? 'subiendo' : 'bajando'} ${uno(Math.abs(p.tendencia))}`}
                    {` · 10 puntos más suman ${uno(p.porDiez)} al global`}
                  </span>
                </span>
                <span className="text-right">
                  <span className="block text-sm font-extrabold tabular-nums">
                    {Math.round(p.margen)}
                  </span>
                  <span className="block text-[11px] text-tinta-suave">por ganar</span>
                </span>
              </li>
            ))}
          </ol>
        </>
      )}
    </Tarjeta>
  );
}
