import { db } from '@/db/db';
import { apuntesDeMaterias, materiasDePerfil, temasDeMaterias } from '@/db/operaciones';
import { useConsulta } from '@/db/useConsulta';
import { usePerfil } from '@/estado/usePerfil';
import { distanciaDias, fechaCorta } from '@/utilidades/fechas';
import { resumenMarkdown } from '@/utilidades/markdown';
import { startOfDay } from 'date-fns';
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
  const { perfil, vocab } = usePerfil();
  const datos = useConsulta(async () => {
    if (!perfil) return null;
    const materias = await materiasDePerfil(perfil.id);
    const ids = materias.map((m) => m.id);
    const temas = await temasDeMaterias(ids);
    const temaIds = new Set(temas.map((t) => t.id));
    const raices = await db.conceptosRaiz
      .filter((r) => r.temaIds.some((t) => temaIds.has(t)))
      .count();
    const tarjetas = await db.tarjetas
      .filter((t) => t.temaId !== undefined && temaIds.has(t.temaId))
      .count();
    const apuntes = (await apuntesDeMaterias(ids)).slice(0, 3);
    return { materias, temas, raices, tarjetas, apuntes };
  }, [perfil?.id]);
  const hoy = startOfDay(new Date()).toISOString();
  const proximos = (datos?.materias ?? [])
    .filter((m) => m.fechaParcial && m.fechaParcial >= hoy)
    .sort((a, b) => a.fechaParcial!.localeCompare(b.fechaParcial!))
    .slice(0, 3);
  const nombreMateria = new Map((datos?.materias ?? []).map((m) => [m.id, m]));

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
              <Dato etiqueta={vocab.materias} valor={datos?.materias.length ?? 0} />
              <Dato etiqueta="Temas" valor={datos?.temas.length ?? 0} />
              <Dato etiqueta="Raíces" valor={datos?.raices ?? 0} />
            </div>
          </div>
        </div>
      </Tarjeta>

      <Tarjeta titulo="Repasos de hoy" icono="repasar" verTodo="/repasar">
        <div className="mb-3 flex items-baseline justify-between">
          <p className="text-3xl font-extrabold tabular-nums">0</p>
          <p className="text-xs font-semibold text-tinta-suave">
            {datos?.tarjetas ?? 0} tarjetas en total
          </p>
        </div>
        <Barra valor={0} total={datos?.tarjetas ?? 0} />
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

      <Tarjeta titulo={`Próximo ${vocab.parcial}`} icono="calendario" verTodo="/materias">
        {proximos.length === 0 ? (
          <EstadoVacio
            texto={`Agrega la fecha del próximo ${vocab.parcial} en cada materia para armar tu plan de estudio.`}
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {proximos.map((m) => (
              <li key={m.id}>
                <a
                  href={hrefDe(`/materias/${m.id}`)}
                  className="flex items-center gap-3 rounded-xl bg-superficie-2/70 px-3 py-2.5 hover:bg-superficie-2"
                >
                  <span className="h-8 w-1.5 rounded-full" style={{ backgroundColor: m.color }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{m.nombre}</span>
                    <span className="block text-xs text-tinta-suave">
                      {fechaCorta(m.fechaParcial!)}
                    </span>
                  </span>
                  <span className="chip">{distanciaDias(m.fechaParcial!)}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>

      <Tarjeta titulo="Apuntes recientes" icono="apuntes" verTodo="/apuntes">
        {(datos?.apuntes.length ?? 0) === 0 ? (
          <EstadoVacio texto="Tus últimos apuntes aparecerán aquí." />
        ) : (
          <ul className="flex flex-col gap-2">
            {datos!.apuntes.map((a) => (
              <li key={a.id}>
                <a
                  href={hrefDe(`/apuntes/${a.id}`)}
                  className="block rounded-xl bg-superficie-2/70 px-3 py-2.5 hover:bg-superficie-2"
                >
                  <span className="flex items-center gap-2 text-xs font-semibold text-tinta-suave">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: nombreMateria.get(a.materiaId)?.color }}
                    />
                    {nombreMateria.get(a.materiaId)?.nombre}
                  </span>
                  <span className="block truncate text-sm font-bold">
                    {a.titulo || resumenMarkdown(a.contenido, 40)}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
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
