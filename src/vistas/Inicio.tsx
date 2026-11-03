import { contarTodo } from '@/db/repositorio';
import { useConsulta } from '@/db/useConsulta';
import { hrefDe } from '@/app/enrutador';
import { EstadoVacio, Tarjeta } from '@/componentes/Tarjeta';
import { ArbolMuestra } from './ArbolMuestra';

function Dato({ etiqueta, valor }: { etiqueta: string; valor: number | string }) {
  return (
    <div className="rounded-xl bg-superficie-2 px-3 py-2.5">
      <p className="text-xs font-semibold text-tinta-suave">{etiqueta}</p>
      <p className="text-xl font-extrabold tabular-nums">{valor}</p>
    </div>
  );
}

function Barra({ valor, total }: { valor: number; total: number }) {
  const pct = total > 0 ? Math.round((valor / total) * 100) : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-superficie-2" role="presentation">
      <div
        className="h-full rounded-full bg-exito transition-[width] duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function Inicio() {
  const conteo = useConsulta(() => contarTodo());
  const c = (k: keyof NonNullable<typeof conteo>) => conteo?.[k] ?? 0;

  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      <Tarjeta titulo="Tu árbol de estudio" icono="raiz" className="md:col-span-2">
        <div className="grid items-center gap-4 sm:grid-cols-[1.2fr_1fr]">
          <div className="aspect-[41/29] w-full rounded-xl bg-superficie-2/60 p-2">
            <ArbolMuestra />
          </div>
          <div className="flex flex-col gap-3">
            <p className="text-sm text-tinta-suave">
              Las hojas son tus temas y las raíces los conceptos base que comparten. El color
              muestra cuánto dominas cada tema; si una raíz se ilumina, de ahí vienen tus fallos.
            </p>
            <ul className="flex flex-col gap-2 text-sm">
              <li className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-exito" /> Dominado
              </li>
              <li className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-oxido" /> Toca repasar
              </li>
              <li className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-brillo" /> Raíz responsable de fallos
              </li>
            </ul>
            <div className="grid grid-cols-3 gap-2">
              <Dato etiqueta="Materias" valor={c('materias')} />
              <Dato etiqueta="Temas" valor={c('temas')} />
              <Dato etiqueta="Raíces" valor={c('conceptosRaiz')} />
            </div>
          </div>
        </div>
      </Tarjeta>

      <Tarjeta titulo="Repasos de hoy" icono="repasar" verTodo="/repasar">
        <div className="mb-3 flex items-baseline justify-between">
          <p className="text-3xl font-extrabold tabular-nums">0</p>
          <p className="text-xs font-semibold text-tinta-suave">
            {c('tarjetas')} tarjetas en total
          </p>
        </div>
        <Barra valor={0} total={c('tarjetas')} />
        <p className="mt-3 text-sm text-tinta-suave">No tienes repasos pendientes por ahora.</p>
      </Tarjeta>

      <Tarjeta titulo="Raíces que más fallan" icono="errores" verTodo="/errores">
        <EstadoVacio
          texto="Cuando registres errores, aquí verás los conceptos base que más se repiten entre tus materias."
          accion={
            <a href={hrefDe('/errores')} className="boton-secundario">
              Registrar un error
            </a>
          }
        />
      </Tarjeta>

      <Tarjeta titulo="Próximo parcial" icono="calendario" verTodo="/notas">
        <EstadoVacio texto="Agrega la fecha de tus parciales en cada materia para armar tu plan de estudio." />
      </Tarjeta>

      <Tarjeta titulo="Apuntes recientes" icono="apuntes" verTodo="/apuntes">
        <EstadoVacio texto="Tus últimos apuntes aparecerán aquí." />
      </Tarjeta>

      <Tarjeta titulo="Plan de hoy" icono="notas" className="md:col-span-2 xl:col-span-3">
        <div className="grid gap-3 sm:grid-cols-3">
          {['Tema con más rendimiento', 'Repaso corto', 'Base de un nivel anterior'].map((t) => (
            <div key={t} className="rounded-xl border border-linea/70 bg-superficie-2/60 p-4">
              <p className="text-sm font-bold">{t}</p>
              <p className="mt-1 text-xs text-tinta-suave">
                Se calculará con tus materias, temas y errores.
              </p>
            </div>
          ))}
        </div>
      </Tarjeta>
    </div>
  );
}
