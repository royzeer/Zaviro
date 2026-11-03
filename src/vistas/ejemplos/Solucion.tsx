import { DiagramaCuerpoLibre } from '@/componentes/DiagramaCuerpoLibre';
import type { Diagrama, Paso } from '@/dominio/ejemplos';

/** Muestra un ejemplo resuelto: enunciado, diagrama, pasos con sus valores y la comprobación. */
export function Solucion({
  enunciado,
  pasos,
  comprobacion,
  comprobado,
  diagrama,
  aviso,
}: {
  enunciado: string;
  pasos: Paso[];
  comprobacion: string;
  comprobado?: boolean | undefined;
  diagrama?: Diagrama | undefined;
  aviso?: string | undefined;
}) {
  return (
    <div className="flex flex-col gap-5">
      {enunciado && <p className="text-[15px] leading-relaxed">{enunciado}</p>}
      {aviso && (
        <p role="note" className="rounded-xl bg-brillo/15 px-3 py-2.5 text-sm">
          {aviso}
        </p>
      )}
      {diagrama && diagrama.fuerzas.length > 0 && (
        <section aria-label="Diagrama de cuerpo libre">
          <h3 className="etiqueta">Diagrama de cuerpo libre</h3>
          <DiagramaCuerpoLibre diagrama={diagrama} />
        </section>
      )}
      <section aria-label="Solución paso a paso">
        <h3 className="etiqueta">Solución paso a paso</h3>
        <ol className="flex flex-col gap-3">
          {pasos.map((p, i) => (
            <li key={i} className="flex gap-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primario text-xs font-bold text-sobre-primario">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-relaxed">{p.descripcion}</p>
                {p.calculo && (
                  <pre className="mt-1.5 overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-superficie-2 px-3 py-2 font-mono text-[13px] leading-relaxed">
                    {p.calculo}
                  </pre>
                )}
                {p.valor && (
                  <p className="mt-1.5 inline-block rounded-lg border border-exito/40 bg-exito/10 px-2.5 py-1 text-sm font-bold tabular-nums">
                    {p.valor}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </section>
      {comprobacion && (
        <section
          aria-label="Comprobación"
          className={`rounded-xl border px-4 py-3 text-sm ${
            comprobado === false ? 'border-brillo/50 bg-brillo/10' : 'border-exito/40 bg-exito/10'
          }`}
        >
          <h3 className="mb-1 font-bold">
            Comprobación
            {comprobado !== undefined && (
              <span className="ml-2 text-xs font-semibold text-tinta-suave">
                {comprobado ? 'los valores cumplen' : 'revisa los datos'}
              </span>
            )}
          </h3>
          <p>{comprobacion}</p>
        </section>
      )}
    </div>
  );
}
