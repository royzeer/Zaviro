import { useEffect, useMemo, useState } from 'react';
import { hrefDe, navegar } from '@/app/enrutador';
import { db } from '@/db/db';
import type { Apunte } from '@/db/esquemas';
import { apuntesDeMaterias, materiasDePerfil, temasDeMaterias } from '@/db/operaciones';
import { ahoraIso, guardar, nuevoId } from '@/db/repositorio';
import { useConsulta } from '@/db/useConsulta';
import { usePerfil } from '@/estado/usePerfil';
import { confirmar } from '@/utilidades/confirmar';
import { Campo } from '@/componentes/Formulario';
import { Icono } from '@/componentes/Icono';
import { EstadoVacio } from '@/componentes/Tarjeta';
import { fechaCorta } from '@/utilidades/fechas';
import { markdownAHtml, resumenMarkdown } from '@/utilidades/markdown';

function Editor({ inicial, esNuevo }: { inicial: Apunte; esNuevo: boolean }) {
  const { perfil } = usePerfil();
  const [a, setA] = useState(inicial);
  const [vista, setVista] = useState<'escribir' | 'previa'>('escribir');
  const [estado, setEstado] = useState('');
  useEffect(() => setA(inicial), [inicial]);

  const datos = useConsulta(async () => {
    if (!perfil) return { materias: [], temas: [] };
    const materias = await materiasDePerfil(perfil.id);
    return { materias, temas: await temasDeMaterias(materias.map((m) => m.id)) };
  }, [perfil?.id]);
  const temas = (datos?.temas ?? []).filter((t) => t.materiaId === a.materiaId);
  const cambiado = JSON.stringify(a) !== JSON.stringify(inicial);

  async function guardarApunte() {
    const { temaId, titulo, ...resto } = a;
    const limpio: Apunte = {
      ...resto,
      ...(temaId ? { temaId } : {}),
      ...(titulo?.trim() ? { titulo: titulo.trim() } : {}),
      fecha: esNuevo ? ahoraIso() : a.fecha,
    };
    await guardar('apuntes', limpio);
    setEstado('Guardado.');
    if (esNuevo) navegar(`/apuntes/${limpio.id}`);
  }

  async function borrar() {
    if (!confirmar('¿Borrar este apunte?')) return;
    await db.apuntes.delete(a.id);
    navegar('/apuntes');
  }

  return (
    <section className="tarjeta flex animate-aparecer flex-col gap-4" aria-label="Editor de apunte">
      <div className="flex items-center justify-between gap-2 lg:hidden">
        <a href={hrefDe('/apuntes')} className="boton-fantasma px-2">
          <Icono nombre="flecha" tamano={16} className="rotate-180" /> Apuntes
        </a>
      </div>
      <input
        className="w-full bg-transparent text-xl font-extrabold tracking-tight outline-none placeholder:text-tinta-suave/60 focus-visible:ring-0"
        placeholder="Título del apunte"
        aria-label="Título del apunte"
        value={a.titulo ?? ''}
        onChange={(e) => setA({ ...a, titulo: e.target.value })}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo etiqueta="Materia">
          {(id) => (
            <select
              id={id}
              className="campo"
              value={a.materiaId}
              onChange={(e) => setA({ ...a, materiaId: e.target.value, temaId: undefined })}
            >
              {(datos?.materias ?? []).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </select>
          )}
        </Campo>
        <Campo etiqueta="Tema (opcional)">
          {(id) => (
            <select
              id={id}
              className="campo"
              value={a.temaId ?? ''}
              onChange={(e) => setA({ ...a, temaId: e.target.value || undefined })}
            >
              <option value="">Sin tema</option>
              {temas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.titulo}
                </option>
              ))}
            </select>
          )}
        </Campo>
      </div>
      <div
        role="tablist"
        aria-label="Modo del editor"
        className="flex gap-1 self-start rounded-xl bg-superficie-2 p-1"
      >
        {(['escribir', 'previa'] as const).map((v) => (
          <button
            key={v}
            role="tab"
            type="button"
            aria-selected={vista === v}
            onClick={() => setVista(v)}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${vista === v ? 'bg-superficie text-tinta shadow-tarjeta' : 'text-tinta-suave'}`}
          >
            {v === 'escribir' ? 'Escribir' : 'Vista previa'}
          </button>
        ))}
      </div>
      {vista === 'escribir' ? (
        <div>
          <textarea
            className="campo min-h-[22rem] resize-y font-mono text-[13.5px] leading-relaxed"
            aria-label="Contenido en Markdown"
            aria-describedby="ayuda-markdown"
            value={a.contenido}
            onChange={(e) => setA({ ...a, contenido: e.target.value })}
            placeholder={
              '## Idea principal\n\nEscribe con **negrita**, *cursiva*, listas con - y código con `comillas`.'
            }
          />
          <p id="ayuda-markdown" className="mt-1.5 text-xs text-tinta-suave">
            Formato Markdown: # para títulos, **negrita**, *cursiva*, - para listas, &gt; para citas
            y ``` para bloques de código.
          </p>
        </div>
      ) : (
        <div
          className="markdown min-h-[22rem] rounded-xl border border-linea/70 p-4"
          dangerouslySetInnerHTML={{
            __html: markdownAHtml(a.contenido) || '<p>Nada para mostrar todavía.</p>',
          }}
        />
      )}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <p className="mr-auto text-sm text-tinta-suave" role="status">
          {cambiado ? 'Cambios sin guardar.' : estado}
        </p>
        {!esNuevo && (
          <button type="button" className="boton-fantasma" onClick={borrar}>
            <Icono nombre="papelera" tamano={16} /> Borrar
          </button>
        )}
        <button
          type="button"
          className="boton-primario"
          onClick={guardarApunte}
          disabled={(!cambiado && !esNuevo) || !a.contenido.trim()}
        >
          Guardar
        </button>
      </div>
    </section>
  );
}

export function Apuntes({ apunteId }: { apunteId?: string }) {
  const { perfil } = usePerfil();
  const [filtro, setFiltro] = useState('');
  const [busqueda, setBusqueda] = useState('');

  const datos = useConsulta(async () => {
    if (!perfil) return null;
    const materias = await materiasDePerfil(perfil.id);
    const apuntes = await apuntesDeMaterias(materias.map((m) => m.id));
    return { materias, apuntes };
  }, [perfil?.id]);

  const nuevoPara = apunteId?.startsWith('nuevo') ? (apunteId.split(':')[1] ?? '') : null;
  const apunteNuevo = useMemo<Apunte | null>(() => {
    if (nuevoPara === null || !datos) return null;
    const materiaId = nuevoPara || filtro || datos.materias[0]?.id;
    return materiaId ? { id: nuevoId(), materiaId, contenido: '', fecha: ahoraIso() } : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nuevoPara, datos?.materias.length]);

  if (!perfil || !datos) return null;
  const { materias, apuntes } = datos;
  const color = new Map(materias.map((m) => [m.id, m]));
  const texto = busqueda.trim().toLowerCase();
  const visibles = apuntes.filter(
    (a) =>
      (!filtro || a.materiaId === filtro) &&
      (!texto || `${a.titulo ?? ''} ${a.contenido}`.toLowerCase().includes(texto)),
  );
  const actual =
    apunteId && nuevoPara === null ? apuntes.find((a) => a.id === apunteId) : undefined;
  const hayEditor = Boolean(actual || apunteNuevo);

  if (materias.length === 0) {
    return (
      <EstadoVacio
        texto="Primero crea una materia; cada apunte pertenece a una."
        accion={
          <a href="#/materias" className="boton-primario">
            Ir a materias
          </a>
        }
      />
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[20rem_1fr]">
      <aside
        className={`flex flex-col gap-3 ${hayEditor ? 'hidden lg:flex' : ''}`}
        aria-label="Lista de apuntes"
      >
        <a
          href={hrefDe(filtro ? `/apuntes/nuevo:${filtro}` : '/apuntes/nuevo')}
          className="boton-primario"
        >
          <Icono nombre="mas" tamano={16} /> Nuevo apunte
        </a>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
          <select
            className="campo"
            aria-label="Filtrar por materia"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
          >
            <option value="">Todas las materias</option>
            {materias.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre}
              </option>
            ))}
          </select>
          <input
            className="campo"
            type="search"
            placeholder="Buscar"
            aria-label="Buscar en apuntes"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        {visibles.length === 0 && (
          <EstadoVacio
            texto={apuntes.length ? 'Ningún apunte coincide.' : 'Aún no tienes apuntes.'}
          />
        )}
        <ul className="flex flex-col gap-2">
          {visibles.map((a) => {
            const m = color.get(a.materiaId);
            return (
              <li key={a.id}>
                <a
                  href={hrefDe(`/apuntes/${a.id}`)}
                  aria-current={a.id === actual?.id ? 'page' : undefined}
                  className={`block rounded-2xl border p-3.5 transition-colors ${a.id === actual?.id ? 'border-primario bg-superficie' : 'border-linea/70 bg-superficie/60 hover:bg-superficie'}`}
                >
                  <p className="flex items-center gap-2 text-xs font-semibold text-tinta-suave">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: m?.color }} />
                    {m?.nombre} · {fechaCorta(a.fecha)}
                  </p>
                  <p className="mt-1 font-bold">{a.titulo || 'Sin título'}</p>
                  <p className="line-clamp-2 text-xs text-tinta-suave">
                    {resumenMarkdown(a.contenido, 120)}
                  </p>
                </a>
              </li>
            );
          })}
        </ul>
      </aside>
      {actual ? (
        <Editor key={actual.id} inicial={actual} esNuevo={false} />
      ) : apunteNuevo ? (
        <Editor key={apunteNuevo.id} inicial={apunteNuevo} esNuevo />
      ) : (
        <div className="hidden lg:block">
          <EstadoVacio
            texto={
              apunteId
                ? 'Ese apunte no existe en este perfil.'
                : 'Elige un apunte de la lista o crea uno nuevo.'
            }
          />
        </div>
      )}
    </div>
  );
}
