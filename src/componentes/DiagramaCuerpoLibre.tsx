import { componentes, largoFlecha, NOMBRE_TIPO_FUERZA, type TipoFuerza } from '@/dominio/fuerzas';
import type { Diagrama } from '@/dominio/ejemplos';
import { num } from '@/dominio/ejemplos';

const COLOR_FUERZA: Record<TipoFuerza, string> = {
  peso: 'rgb(var(--f-peso))',
  normal: 'rgb(var(--f-normal))',
  friccion: 'rgb(var(--f-friccion))',
  tension: 'rgb(var(--f-tension))',
  aplicada: 'rgb(var(--f-aplicada))',
};

const ANCHO = 420;
const ALTO = 330;
const C = { x: ANCHO / 2, y: ALTO / 2 + 6 };
const rad = (g: number) => (g * Math.PI) / 180;

/** Punto a `largo` del centro en la dirección `angulo` (y del SVG crece hacia abajo). */
const punto = (angulo: number, largo: number) => ({
  x: C.x + largo * Math.cos(rad(angulo)),
  y: C.y - largo * Math.sin(rad(angulo)),
});

function Flecha({ angulo, largo, color }: { angulo: number; largo: number; color: string }) {
  const fin = punto(angulo, largo);
  const base = punto(angulo, largo - 11);
  const lado = (s: number) => ({
    x: base.x + s * 5.5 * Math.cos(rad(angulo + 90)),
    y: base.y - s * 5.5 * Math.sin(rad(angulo + 90)),
  });
  const a = lado(1);
  const b = lado(-1);
  return (
    <g>
      <line
        x1={C.x}
        y1={C.y}
        x2={base.x}
        y2={base.y}
        stroke={color}
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <polygon points={`${fin.x},${fin.y} ${a.x},${a.y} ${b.x},${b.y}`} fill={color} />
    </g>
  );
}

/**
 * Diagrama de cuerpo libre: el cuerpo (bloque sobre un plano o partícula), los ejes y cada fuerza
 * como flecha desde el centro, con su largo proporcional a la magnitud y un color por tipo.
 */
export function DiagramaCuerpoLibre({ diagrama }: { diagrama: Diagrama }) {
  const { fuerzas, cuerpo, inclinacion } = diagrama;
  const mayor = Math.max(0, ...fuerzas.map((f) => f.magnitud));
  const descripcion = `Diagrama de cuerpo libre: ${fuerzas
    .map((f) => `${f.nombre} de ${num(f.magnitud)} ${f.unidad} a ${num(f.angulo, 1)} grados`)
    .join('; ')}.`;

  // Superficie del plano: pasa justo debajo del bloque.
  const debajo = {
    x: C.x + 22 * Math.sin(rad(inclinacion)),
    y: C.y + 22 * Math.cos(rad(inclinacion)),
  };
  const largoPlano = 260;
  const p1 = {
    x: debajo.x - largoPlano * Math.cos(rad(inclinacion)),
    y: debajo.y + largoPlano * Math.sin(rad(inclinacion)),
  };
  const p2 = {
    x: debajo.x + largoPlano * Math.cos(rad(inclinacion)),
    y: debajo.y - largoPlano * Math.sin(rad(inclinacion)),
  };

  return (
    <figure className="flex flex-col gap-3">
      <svg
        viewBox={`0 0 ${ANCHO} ${ALTO}`}
        className="h-auto w-full rounded-xl bg-superficie-2/50"
        role="img"
        aria-label={descripcion}
      >
        <defs>
          <clipPath id="dcl-marco">
            <rect width={ANCHO} height={ALTO} rx="12" />
          </clipPath>
        </defs>
        <g clipPath="url(#dcl-marco)">
          {/* Ejes de referencia */}
          <g stroke="rgb(var(--tinta-suave))" strokeOpacity="0.45" strokeDasharray="4 5">
            <line x1={C.x - 150} x2={C.x + 150} y1={C.y} y2={C.y} />
            <line x1={C.x} x2={C.x} y1={C.y - 140} y2={C.y + 140} />
          </g>
          <text x={C.x + 154} y={C.y + 4} fontSize="11" fill="rgb(var(--tinta-suave))">
            x
          </text>
          <text x={C.x + 5} y={C.y - 142} fontSize="11" fill="rgb(var(--tinta-suave))">
            y
          </text>

          {cuerpo === 'bloque' && (
            <>
              <line
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke="rgb(var(--acento))"
                strokeWidth="2.5"
              />
              {inclinacion > 0 && (
                <>
                  <line
                    x1={p1.x}
                    y1={p1.y}
                    x2={p1.x + 90}
                    y2={p1.y}
                    stroke="rgb(var(--acento))"
                    strokeOpacity="0.6"
                  />
                  <path
                    d={`M${p1.x + 60},${p1.y} A60,60 0 0,0 ${p1.x + 60 * Math.cos(rad(inclinacion))},${p1.y - 60 * Math.sin(rad(inclinacion))}`}
                    fill="none"
                    stroke="rgb(var(--acento))"
                  />
                  <text x={p1.x + 66} y={p1.y - 8} fontSize="12" fill="rgb(var(--tinta))">
                    {num(inclinacion, 1)}°
                  </text>
                </>
              )}
              <rect
                x={C.x - 30}
                y={C.y - 22}
                width="60"
                height="44"
                rx="4"
                transform={`rotate(${-inclinacion} ${C.x} ${C.y})`}
                fill="rgb(var(--superficie))"
                stroke="rgb(var(--tinta))"
                strokeWidth="1.5"
              />
            </>
          )}

          {fuerzas.map((f, i) => (
            <Flecha
              key={i}
              angulo={f.angulo}
              largo={largoFlecha(f.magnitud, mayor, 40, 118)}
              color={COLOR_FUERZA[f.tipo]}
            />
          ))}
          <circle cx={C.x} cy={C.y} r={cuerpo === 'particula' ? 6 : 3.5} fill="rgb(var(--tinta))" />

          {fuerzas.map((f, i) => {
            const fin = punto(f.angulo, largoFlecha(f.magnitud, mayor, 40, 118) + 16);
            const cos = Math.cos(rad(f.angulo));
            return (
              <text
                key={i}
                x={fin.x}
                y={fin.y + 4}
                textAnchor={cos > 0.3 ? 'start' : cos < -0.3 ? 'end' : 'middle'}
                fontSize="13"
                fontWeight="700"
                fill={COLOR_FUERZA[f.tipo]}
                paintOrder="stroke"
                stroke="rgb(var(--superficie))"
                strokeWidth="4"
              >
                {f.nombre} = {num(f.magnitud)} {f.unidad}
              </text>
            );
          })}
        </g>
      </svg>
      <figcaption>
        <table className="w-full text-sm">
          <caption className="sr-only">Fuerzas del diagrama con sus componentes</caption>
          <thead>
            <tr className="text-left text-xs text-tinta-suave">
              <th scope="col" className="py-1 font-semibold">
                Fuerza
              </th>
              <th scope="col" className="py-1 text-right font-semibold">
                Magnitud
              </th>
              <th scope="col" className="py-1 text-right font-semibold">
                Ángulo
              </th>
              <th scope="col" className="py-1 text-right font-semibold">
                Fx
              </th>
              <th scope="col" className="py-1 text-right font-semibold">
                Fy
              </th>
            </tr>
          </thead>
          <tbody>
            {fuerzas.map((f, i) => {
              const c = componentes(f);
              return (
                <tr key={i} className="border-t border-linea/60">
                  <td className="py-1.5">
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: COLOR_FUERZA[f.tipo] }}
                      />
                      <span className="font-bold">{f.nombre}</span>
                      <span className="text-xs text-tinta-suave">{NOMBRE_TIPO_FUERZA[f.tipo]}</span>
                    </span>
                  </td>
                  <td className="py-1.5 text-right tabular-nums">
                    {num(f.magnitud)} {f.unidad}
                  </td>
                  <td className="py-1.5 text-right tabular-nums">{num(f.angulo, 1)}°</td>
                  <td className="py-1.5 text-right tabular-nums">{num(c.x)}</td>
                  <td className="py-1.5 text-right tabular-nums">{num(c.y)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-tinta-suave">
          Los ángulos se miden desde el eje x positivo, en sentido contrario a las manecillas del
          reloj. El largo de cada flecha es proporcional a su magnitud.
        </p>
      </figcaption>
    </figure>
  );
}
