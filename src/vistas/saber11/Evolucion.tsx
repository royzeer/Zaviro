import { Tarjeta, EstadoVacio } from '@/componentes/Tarjeta';
import type { PuntoEvolucion } from '@/dominio/saber11';
import { fechaCorta } from '@/utilidades/fechas';

const ANCHO = 560;
const ALTO = 220;
const M = { izq: 40, der: 16, arriba: 22, abajo: 30 };
/** Espacio entre el eje y el primer o último punto, para que las etiquetas no choquen. */
const AIRE = 28;

/** Línea del puntaje global en el tiempo. */
export function Evolucion({ puntos }: { puntos: PuntoEvolucion[] }) {
  if (puntos.length === 0)
    return (
      <Tarjeta titulo="Evolución del puntaje" icono="notas">
        <EstadoVacio texto="Cuando registres tu primer simulacro, aquí verás cómo cambia tu puntaje global." />
      </Tarjeta>
    );
  const valores = puntos.map((p) => p.global);
  const min = Math.max(0, Math.floor((Math.min(...valores) - 30) / 50) * 50);
  const max = Math.min(500, Math.ceil((Math.max(...valores) + 30) / 50) * 50);
  const x = (i: number) =>
    puntos.length === 1
      ? (M.izq + ANCHO - M.der) / 2
      : M.izq + AIRE + (i / (puntos.length - 1)) * (ANCHO - M.izq - M.der - 2 * AIRE);
  const y = (v: number) => M.arriba + (1 - (v - min) / (max - min)) * (ALTO - M.arriba - M.abajo);
  const lineas: number[] = [];
  for (let v = min; v <= max; v += 50) lineas.push(v);
  const ultimo = puntos[puntos.length - 1]!;
  const primero = puntos[0]!;
  const cambioTotal = ultimo.global - primero.global;
  const descripcion = `Puntaje global en ${puntos.length} simulacros: de ${primero.global} a ${ultimo.global}.`;

  return (
    <Tarjeta titulo="Evolución del puntaje" icono="notas">
      <div className="mb-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <p className="text-3xl font-extrabold tabular-nums">{ultimo.global}</p>
        <p className="text-sm text-tinta-suave">
          último simulacro
          {puntos.length > 1 && (
            <>
              {' · '}
              <span
                className={
                  cambioTotal >= 0 ? 'font-semibold text-exito' : 'font-semibold text-peligro'
                }
              >
                {cambioTotal >= 0 ? '+' : ''}
                {cambioTotal}
              </span>{' '}
              desde el primero
            </>
          )}
        </p>
      </div>
      <svg
        viewBox={`0 0 ${ANCHO} ${ALTO}`}
        className="h-auto w-full"
        role="img"
        aria-label={descripcion}
      >
        {lineas.map((v) => (
          <g key={v}>
            <line
              x1={M.izq}
              x2={ANCHO - M.der}
              y1={y(v)}
              y2={y(v)}
              stroke="rgb(var(--linea))"
              strokeDasharray={v === min ? undefined : '2 4'}
            />
            <text
              x={M.izq - 8}
              y={y(v) + 4}
              textAnchor="end"
              fontSize="11"
              fill="rgb(var(--tinta-suave))"
            >
              {v}
            </text>
          </g>
        ))}
        {puntos.length > 1 && (
          <polyline
            fill="none"
            stroke="rgb(var(--primario))"
            strokeWidth="2.5"
            strokeLinejoin="round"
            points={puntos.map((p, i) => `${x(i)},${y(p.global)}`).join(' ')}
          />
        )}
        {puntos.map((p, i) => (
          <g key={p.id}>
            <circle
              cx={x(i)}
              cy={y(p.global)}
              r="4.5"
              fill="rgb(var(--superficie))"
              stroke="rgb(var(--primario))"
              strokeWidth="2.5"
            />
            <text
              x={x(i)}
              y={y(p.global) - 10}
              textAnchor="middle"
              fontSize="11.5"
              fontWeight="700"
              fill="rgb(var(--tinta))"
            >
              {p.global}
            </text>
            {(puntos.length <= 6 || i === 0 || i === puntos.length - 1) && (
              <text
                x={x(i)}
                y={ALTO - 10}
                textAnchor="middle"
                fontSize="11"
                fill="rgb(var(--tinta-suave))"
              >
                {fechaCorta(p.fecha)}
              </text>
            )}
          </g>
        ))}
      </svg>
    </Tarjeta>
  );
}
