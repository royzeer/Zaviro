import { db } from '@/db/db';
import { apuntesDeMaterias, materiasDePerfil, temasDeMaterias } from '@/db/operaciones';
import { useConsulta } from '@/db/useConsulta';
import { usePerfil } from '@/estado/usePerfil';
import { distanciaDias, fechaCorta } from '@/utilidades/fechas';
import { resumenMarkdown } from '@/utilidades/markdown';
import { startOfDay } from 'date-fns';
import { useMemo } from 'react';
import type { Nivel } from '@/dominio/catalogo';
import { NOMBRE_NIVEL } from '@/dominio/catalogo';
import { puntuarRaices, temasQueFallan } from '@/dominio/raices';
import type { EntradaArbol } from '@/dominio/arbol';
import { ArbolVivo } from '@/componentes/ArbolVivo';
import { hrefDe } from '@/app/enrutador';
import { EstadoVacio, Tarjeta } from '@/componentes/Tarjeta';
import { ArbolMuestra } from './ArbolMuestra';
import { PlanDeHoy } from './inicio/PlanDeHoy';

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
    const conceptos = await db.conceptosRaiz.toArray();
    const raices = conceptos.filter((r) => r.temaIds.some((t) => temaIds.has(t))).length;
    const tarjetas = await db.tarjetas
      .filter((t) => t.temaId !== undefined && temaIds.has(t.temaId))
      .toArray();
    const ahora = new Date().toISOString();
    const vencidas = tarjetas.filter((t) => t.proximoRepaso <= ahora);
    const apuntes = (await apuntesDeMaterias(ids)).slice(0, 3);
    const errores = await db.errores.toArray();
    const perfiles = await db.perfiles.toArray();
    const todasMaterias = await db.materias.toArray();
    const nivelPerfil = new Map(perfiles.map((p) => [p.id, p.nivel]));
    const nivelPorMateria = new Map<string, Nivel>();
    for (const m of todasMaterias) {
      const n = nivelPerfil.get(m.perfilId);
      if (n) nivelPorMateria.set(m.id, n);
    }
    const todas = puntuarRaices({ conceptos, errores, nivelPorMateria });
    const ranking = todas.slice(0, 3);
    const pendiente = todas.find((r) => r.basePendiente && r.noResueltos > 0);
    const base = pendiente
      ? {
          nombre: pendiente.concepto.nombre,
          nivelOrigen: pendiente.concepto.nivelOrigen,
          noResueltos: pendiente.noResueltos,
        }
      : undefined;
    return {
      materias,
      temas,
      raices,
      tarjetas: tarjetas.length,
      vencidas: vencidas.length,
      oxidados: new Set(vencidas.map((t) => t.temaId!)),
      fallan: temasQueFallan(errores.filter((e) => ids.includes(e.materiaId))),
      conceptos,
      ranking,
      base,
      apuntes,
    };
  }, [perfil?.id]);
  const hoy = startOfDay(new Date()).toISOString();
  const proximos = (datos?.materias ?? [])
    .filter((m) => m.fechaParcial && m.fechaParcial >= hoy)
    .sort((a, b) => a.fechaParcial!.localeCompare(b.fechaParcial!))
    .slice(0, 3);
  const nombreMateria = new Map((datos?.materias ?? []).map((m) => [m.id, m]));
  const entrada = useMemo<EntradaArbol | null>(
    () =>
      perfil && datos
        ? {
            nivelPerfil: perfil.nivel,
            materias: datos.materias,
            temas: datos.temas,
            conceptos: datos.conceptos,
          }
        : null,
    [perfil, datos],
  );

  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      <Tarjeta titulo="Tu árbol de estudio" icono="raiz" className="md:col-span-2">
        {entrada && datos && datos.temas.length > 0 ? (
          <ArbolVivo entrada={entrada} fallan={datos.fallan} oxidados={datos.oxidados} />
        ) : (
          <div className="grid items-center gap-4 sm:grid-cols-[1.2fr_1fr]">
            <div className="aspect-[41/29] w-full rounded-xl bg-superficie-2/60 p-2">
              <ArbolMuestra />
            </div>
            <div className="flex flex-col gap-3">
              <p className="text-sm text-tinta-suave">
                Las hojas son tus temas y las raíces los conceptos base que comparten. El color
                muestra cuánto dominas cada tema; si una raíz se ilumina, de ahí vienen tus fallos.
              </p>
              <a href={hrefDe('/materias')} className="boton-primario self-start">
                Agregar temas
              </a>
              <div className="grid grid-cols-3 gap-2">
                <Dato etiqueta={vocab.materias} valor={datos?.materias.length ?? 0} />
                <Dato etiqueta="Temas" valor={datos?.temas.length ?? 0} />
                <Dato etiqueta="Raíces" valor={datos?.raices ?? 0} />
              </div>
            </div>
          </div>
        )}
      </Tarjeta>

      <Tarjeta titulo="Repasos de hoy" icono="repasar" verTodo="/repasar">
        <div className="mb-3 flex items-baseline justify-between">
          <p className="text-3xl font-extrabold tabular-nums">{datos?.vencidas ?? 0}</p>
          <p className="text-xs font-semibold text-tinta-suave">
            {datos?.tarjetas ?? 0} tarjetas en total
          </p>
        </div>
        <Barra
          valor={(datos?.tarjetas ?? 0) - (datos?.vencidas ?? 0)}
          total={datos?.tarjetas ?? 0}
        />
        <p className="mt-3 text-sm text-tinta-suave">
          {datos?.vencidas
            ? `Tienes ${datos.vencidas} ${datos.vencidas === 1 ? 'tarjeta' : 'tarjetas'} para repasar hoy.`
            : 'No tienes repasos pendientes por ahora.'}
        </p>
      </Tarjeta>

      <Tarjeta titulo="Raíces que más fallan" icono="errores" verTodo="/errores">
        {(datos?.ranking.length ?? 0) === 0 ? (
          <EstadoVacio
            texto="Cuando registres errores, aquí verás los conceptos base que más se repiten entre tus materias."
            accion={
              <a href={hrefDe('/errores')} className="boton-secundario">
                Registrar un error
              </a>
            }
          />
        ) : (
          <ol className="flex flex-col gap-2">
            {datos!.ranking.map((r, i) => (
              <li
                key={r.concepto.id}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${r.basePendiente ? 'bg-brillo/15' : 'bg-superficie-2/70'}`}
              >
                <span className="text-sm font-extrabold tabular-nums text-tinta-suave">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{r.concepto.nombre}</span>
                  <span className="block text-xs text-tinta-suave">
                    {r.noResueltos} sin resolver · {r.materiaIds.length}{' '}
                    {r.materiaIds.length === 1 ? 'materia' : 'materias'}
                    {r.basePendiente
                      ? ` · base de ${NOMBRE_NIVEL[r.concepto.nivelOrigen].toLowerCase()}`
                      : ''}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        )}
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

      <Tarjeta
        titulo="Plan de hoy"
        icono="notas"
        verTodo="/notas"
        className="md:col-span-2 xl:col-span-3"
      >
        {perfil && <PlanDeHoy perfil={perfil} base={datos?.base} />}
      </Tarjeta>
    </div>
  );
}
