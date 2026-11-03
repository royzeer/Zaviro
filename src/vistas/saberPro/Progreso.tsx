import { EstadoVacio, Tarjeta } from '@/componentes/Tarjeta';
import type { ResumenModulo } from '@/dominio/saberPro';
import { fechaCorta } from '@/utilidades/fechas';

const pct = (n: number) => `${Math.round(n)}%`;

export function Progreso({ resumen, ventana }: { resumen: ResumenModulo[]; ventana: number }) {
  return (
    <Tarjeta titulo="Qué reforzar primero" icono="errores">
      {resumen.length === 0 ? (
        <EstadoVacio texto="Agrega tus módulos y registra prácticas para ver en cuál te conviene trabajar." />
      ) : (
        <>
          <p className="mb-3 text-sm text-tinta-suave">
            Primero los módulos que aún no has practicado y luego los de menor porcentaje de
            aciertos en tus últimas {ventana} prácticas.
          </p>
          <ol className="flex flex-col gap-2">
            {resumen.map((r, i) => (
              <li
                key={r.modulo.id}
                className={`rounded-xl px-3 py-2.5 ${i === 0 ? 'bg-brillo/15' : 'bg-superficie-2/70'}`}
              >
                <div className="flex items-center gap-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{r.modulo.nombre}</span>
                    <span className="block text-xs text-tinta-suave">
                      {r.modulo.tipo === 'generico' ? 'Genérico' : 'Específico'}
                      {r.practicas === 0
                        ? ' · sin prácticas'
                        : ` · ${r.practicas} ${r.practicas === 1 ? 'práctica' : 'prácticas'} · última ${fechaCorta(r.ultima!)}`}
                      {r.tendencia !== 0 &&
                        ` · ${r.tendencia > 0 ? 'subiendo' : 'bajando'} ${Math.round(Math.abs(r.tendencia))} puntos`}
                    </span>
                  </span>
                  <span className="text-sm font-extrabold tabular-nums">
                    {r.porcentaje === null ? '--' : pct(r.porcentaje)}
                  </span>
                </div>
                {r.porcentaje !== null && (
                  <div
                    className="mt-2 h-1.5 overflow-hidden rounded-full bg-linea/60"
                    role="presentation"
                  >
                    <div
                      className="h-full rounded-full bg-primario"
                      style={{ width: pct(r.porcentaje) }}
                    />
                  </div>
                )}
              </li>
            ))}
          </ol>
        </>
      )}
    </Tarjeta>
  );
}
