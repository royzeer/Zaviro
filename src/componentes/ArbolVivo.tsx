import { useMemo, useState } from 'react';
import { hrefDe } from '@/app/enrutador';
import { calcularArbol, curva, type EntradaArbol } from '@/dominio/arbol';
import { esNivelAnterior, NOMBRE_NIVEL } from '@/dominio/catalogo';

interface Props {
  entrada: EntradaArbol;
  /** Temas con errores recientes sin resolver. */
  fallan: Set<string>;
  /** Temas con repasos vencidos. */
  oxidados: Set<string>;
}

function colorDominio(d: number) {
  // De arena (poco dominio) a verde (dominado), usando los tokens del tema.
  return { fill: 'rgb(var(--exito))', fillOpacity: 0.22 + 0.78 * Math.min(1, Math.max(0, d)) };
}

export function ArbolVivo({ entrada, fallan, oxidados }: Props) {
  const forma = useMemo(() => calcularArbol(entrada), [entrada]);
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const { medidas, tronco } = forma;
  const ramaPorId = new Map(forma.ramas.map((r) => [r.id, r]));
  const hojaSel = forma.hojas.find((h) => h.id === seleccion);
  const raicesDeHoja = (id: string) => forma.raices.filter((r) => r.temaIds.includes(id));
  // Una raíz se enciende si sostiene un tema que falla o el tema seleccionado.
  const encendidas = new Set(
    forma.raices
      .filter((r) =>
        seleccion ? r.temaIds.includes(seleccion) : r.temaIds.some((t) => fallan.has(t)),
      )
      .map((r) => r.id),
  );
  const rutas = seleccion ? raicesDeHoja(seleccion) : [];

  return (
    <div className="flex flex-col gap-4">
      <svg
        viewBox={`0 0 ${medidas.ancho} ${medidas.alto}`}
        className="h-auto w-full select-none rounded-xl bg-superficie-2/50"
        role="group"
        aria-label="Árbol de estudio: hojas son temas y raíces son conceptos base"
      >
        <defs>
          <filter id="resplandor" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="tierra" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="rgb(var(--acento))" stopOpacity="0.16" />
            <stop offset="1" stopColor="rgb(var(--acento))" stopOpacity="0.04" />
          </linearGradient>
        </defs>

        <rect
          x="0"
          y={medidas.suelo}
          width={medidas.ancho}
          height={medidas.alto - medidas.suelo}
          fill="url(#tierra)"
        />
        <line
          x1="0"
          x2={medidas.ancho}
          y1={medidas.suelo}
          y2={medidas.suelo}
          stroke="rgb(var(--acento))"
          strokeOpacity="0.35"
          strokeWidth="1.5"
        />

        {/* Raíces */}
        <g fill="none" strokeLinecap="round">
          {forma.raices.map((r) => (
            <path
              key={r.id}
              d={curva(tronco.x, tronco.base, r.x, r.y)}
              stroke={encendidas.has(r.id) ? 'rgb(var(--brillo))' : 'rgb(var(--tinta-suave))'}
              strokeOpacity={encendidas.has(r.id) ? 0.95 : 0.3}
              strokeWidth={encendidas.has(r.id) ? 3.5 : 2}
              filter={encendidas.has(r.id) ? 'url(#resplandor)' : undefined}
              className={encendidas.has(r.id) ? 'raiz-encendida' : undefined}
            />
          ))}
        </g>

        {/* Tronco y ramas */}
        <path
          d={`M${tronco.x - 11},${tronco.base} Q${tronco.x - 5},${(tronco.base + tronco.copa) / 2} ${tronco.x - 4},${tronco.copa} L${tronco.x + 4},${tronco.copa} Q${tronco.x + 5},${(tronco.base + tronco.copa) / 2} ${tronco.x + 11},${tronco.base} Z`}
          fill="rgb(var(--acento))"
        />
        <g fill="none" stroke="rgb(var(--acento))" strokeLinecap="round">
          {forma.ramas.map((r) => (
            <path
              key={r.id}
              d={`M${tronco.x},${tronco.copa} Q${(tronco.x + r.x) / 2},${r.y + 10} ${r.x},${r.y}`}
              strokeWidth="5"
            />
          ))}
          {forma.hojas.map((h) => {
            const r = ramaPorId.get(h.materiaId);
            return r ? (
              <path
                key={h.id}
                d={`M${r.x},${r.y} Q${(r.x + h.x) / 2},${(r.y + h.y) / 2 + 8} ${h.x},${h.y}`}
                strokeWidth="2"
                strokeOpacity="0.7"
              />
            ) : null;
          })}
        </g>

        {/* Camino de la hoja seleccionada hasta sus raíces */}
        {hojaSel && (
          <g
            fill="none"
            stroke="rgb(var(--brillo))"
            strokeWidth="2.5"
            strokeDasharray="5 5"
            strokeLinecap="round"
            filter="url(#resplandor)"
          >
            {rutas.map((r) => (
              <path
                key={r.id}
                d={`M${hojaSel.x},${hojaSel.y} L${tronco.x},${tronco.copa} L${tronco.x},${tronco.base} ${curva(tronco.x, tronco.base, r.x, r.y).replace(/^M[^C]+/, '')}`}
              />
            ))}
          </g>
        )}

        {/* Nodos de raíz */}
        {forma.raices.map((r) => {
          const on = encendidas.has(r.id);
          return (
            <g key={r.id}>
              <circle
                cx={r.x}
                cy={r.y}
                r={on ? 8 : 6}
                fill={on ? 'rgb(var(--brillo))' : 'rgb(var(--tinta-suave))'}
                fillOpacity={on ? 1 : 0.55}
                filter={on ? 'url(#resplandor)' : undefined}
              />
              <text
                x={r.x}
                y={r.etiquetaArriba ? r.y - 13 : r.y + 22}
                textAnchor="middle"
                fontSize="12.5"
                fontWeight={on ? 700 : 600}
                fill="rgb(var(--tinta))"
                fillOpacity={on ? 1 : 0.75}
              >
                {r.nombre.length > 20 ? `${r.nombre.slice(0, 19)}…` : r.nombre}
              </text>
            </g>
          );
        })}

        {/* Nombres de materias */}
        {forma.ramas.map((r) => (
          <g key={r.id}>
            <title>{r.nombre}</title>
            <circle
              cx={r.x}
              cy={r.y}
              r="6"
              fill={r.color}
              stroke="rgb(var(--superficie))"
              strokeWidth="2"
            />
          </g>
        ))}

        {/* Hojas */}
        {forma.hojas.map((h, i) => {
          const oxidado = oxidados.has(h.id);
          const falla = fallan.has(h.id);
          const { fill, fillOpacity } = colorDominio(h.dominio);
          const estado = falla ? ', con errores recientes' : oxidado ? ', toca repasar' : '';
          return (
            <g
              key={h.id}
              className="hoja-arbol"
              role="button"
              tabIndex={0}
              aria-pressed={seleccion === h.id}
              aria-label={`${h.titulo}, dominio ${Math.round(h.dominio * 100)}%${estado}`}
              onClick={() => setSeleccion(seleccion === h.id ? null : h.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSeleccion(seleccion === h.id ? null : h.id);
                }
              }}
            >
              <circle
                className="anillo"
                cx={h.x}
                cy={h.y}
                r={h.r + 5}
                fill="none"
                stroke="rgb(var(--tinta))"
                strokeWidth="2"
              />
              <g className="cuerpo" style={{ animationDelay: `${i * 25}ms` }}>
                <circle cx={h.x} cy={h.y} r={h.r} fill="rgb(var(--superficie))" />
                <circle
                  cx={h.x}
                  cy={h.y}
                  r={h.r}
                  fill={oxidado ? 'rgb(var(--oxido))' : fill}
                  fillOpacity={oxidado ? 0.85 : fillOpacity}
                  stroke={
                    falla
                      ? 'rgb(var(--peligro))'
                      : oxidado
                        ? 'rgb(var(--oxido))'
                        : 'rgb(var(--exito))'
                  }
                  strokeWidth={falla ? 3 : 1.5}
                  strokeDasharray={oxidado && !falla ? '3 2' : undefined}
                />
              </g>
            </g>
          );
        })}
      </svg>

      <div className="grid gap-4 text-sm sm:grid-cols-[1fr_auto]">
        <div aria-live="polite">
          {hojaSel ? (
            <div className="rounded-xl border border-linea/70 p-3">
              <p className="text-xs font-semibold text-tinta-suave">
                {ramaPorId.get(hojaSel.materiaId)?.nombre}
              </p>
              <p className="font-bold">{hojaSel.titulo}</p>
              <p className="mt-1 text-xs text-tinta-suave">
                Dominio {Math.round(hojaSel.dominio * 100)}%
                {fallan.has(hojaSel.id) ? ' · con errores recientes' : ''}
                {oxidados.has(hojaSel.id) ? ' · toca repasar' : ''}
              </p>
              {rutas.length > 0 ? (
                <ul className="mt-2 flex flex-col gap-1">
                  {rutas.map((r) => (
                    <li key={r.id} className="flex items-center gap-2 text-xs">
                      <span className="h-2 w-2 rounded-full bg-brillo" />
                      <span className="font-semibold">{r.nombre}</span>
                      {esNivelAnterior(r.nivelOrigen, entrada.nivelPerfil) && (
                        <span className="text-tinta-suave">({NOMBRE_NIVEL[r.nivelOrigen]})</span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-tinta-suave">Aún no tiene raíces enlazadas.</p>
              )}
              <a
                href={hrefDe(`/materias/${hojaSel.materiaId}`)}
                className="mt-2 inline-block text-xs font-semibold underline"
              >
                Ver materia
              </a>
            </div>
          ) : (
            <p className="text-tinta-suave">
              Toca una hoja para ver sus raíces. Las hojas son tus temas; su tamaño es el peso en el
              examen.
            </p>
          )}
        </div>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-1">
          <li className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-exito" /> Más dominio, más verde
          </li>
          <li className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full border border-dashed border-oxido bg-oxido/80" />{' '}
            Oxidado: toca repasar
          </li>
          <li className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full border-2 border-peligro" /> Con errores recientes
          </li>
          <li className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-brillo" /> Raíz responsable
          </li>
        </ul>
      </div>
    </div>
  );
}
