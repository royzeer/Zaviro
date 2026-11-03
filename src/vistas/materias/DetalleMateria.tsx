import { useState } from 'react';
import { hrefDe, navegar } from '@/app/enrutador';
import type { Apunte, CorteMateria, Materia, PerfilAcademico, Tema } from '@/db/esquemas';
import { borrarMateria, borrarTema, cortesIniciales } from '@/db/operaciones';
import { guardar, nuevoId } from '@/db/repositorio';
import {
  ESTADOS_EVIDENCIA,
  NOMBRE_ESTADO_EVIDENCIA,
  NOMBRE_ESTADO_MATERIA,
  NOMBRE_TIPO_MATERIA,
  type EstadoEvidencia,
} from '@/dominio/catalogo';
import { prerrequisitosPendientes } from '@/dominio/creditos';
import { horasDeMateria, sumaPesos, vocabulario } from '@/dominio/niveles';
import { Dialogo } from '@/componentes/Dialogo';
import { confirmar } from '@/utilidades/confirmar';
import { Campo, NumeroEntrada } from '@/componentes/Formulario';
import { Icono } from '@/componentes/Icono';
import { EstadoVacio, Tarjeta } from '@/componentes/Tarjeta';
import { distanciaDias, fechaCorta, fechaInputAIso, isoAFechaInput } from '@/utilidades/fechas';
import { resumenMarkdown } from '@/utilidades/markdown';
import { FormMateria } from './FormMateria';

function Cortes({ perfil, materia }: { perfil: PerfilAcademico; materia: Materia }) {
  const vocab = vocabulario(perfil.nivel);
  const { reglas } = perfil;
  const esEvidencias = reglas.evaluacion.tipo === 'evidencias';
  const suma = sumaPesos(materia.cortes);
  const fuera = (n?: number) =>
    n !== undefined && (n < reglas.escala.minimo || n > reglas.escala.maximo);

  const actualizar = (cambio: (c: CorteMateria[]) => void) => {
    const cortes = structuredClone(materia.cortes);
    cambio(cortes);
    void guardar('materias', { ...materia, cortes });
  };
  const setCampo = <K extends keyof CorteMateria>(
    i: number,
    k: K,
    v: CorteMateria[K] | undefined,
  ) =>
    actualizar((c) => {
      if (v === undefined) delete c[i]![k];
      else c[i]![k] = v;
    });

  return (
    <Tarjeta titulo={vocab.componentes} icono="notas">
      <p className="mb-4 text-xs text-tinta-suave">{vocab.ayudaEvaluacion}</p>
      {materia.cortes.length === 0 && (
        <EstadoVacio
          texto={`Esta ${vocab.materia.toLowerCase()} no tiene ${vocab.componentes.toLowerCase()}.`}
        />
      )}
      <ul className="flex flex-col gap-3">
        {materia.cortes.map((c, i) => (
          <li
            key={i}
            className="grid grid-cols-2 items-end gap-2 rounded-xl border border-linea/70 bg-superficie-2/40 p-3 sm:grid-cols-[5.5rem_5.5rem_minmax(8.5rem,1fr)_auto]"
          >
            <Campo etiqueta="Nombre" className="col-span-full">
              {(id) => (
                <input
                  id={id}
                  className="campo"
                  value={c.nombre}
                  onChange={(e) => setCampo(i, 'nombre', e.target.value || c.nombre)}
                />
              )}
            </Campo>
            <Campo etiqueta="Peso %">
              {(id) => (
                <NumeroEntrada
                  id={id}
                  min={0}
                  max={100}
                  valor={c.peso}
                  onCambio={(v) => v !== null && v >= 0 && v <= 100 && setCampo(i, 'peso', v)}
                />
              )}
            </Campo>
            {reglas.usaNotas ? (
              <Campo etiqueta="Nota">
                {(id) => (
                  <NumeroEntrada
                    id={id}
                    vacioPermitido
                    placeholder="—"
                    min={reglas.escala.minimo}
                    max={reglas.escala.maximo}
                    valor={c.nota}
                    onCambio={(v) => setCampo(i, 'nota', v ?? undefined)}
                  />
                )}
              </Campo>
            ) : null}
            <Campo etiqueta="Fecha">
              {(id) => (
                <input
                  id={id}
                  type="date"
                  className="campo"
                  value={isoAFechaInput(c.fecha)}
                  onChange={(e) => setCampo(i, 'fecha', fechaInputAIso(e.target.value))}
                />
              )}
            </Campo>
            <div
              className={`flex items-end gap-2 ${reglas.usaNotas ? 'col-span-2 sm:col-span-1' : ''}`}
            >
              {esEvidencias && (
                <Campo etiqueta="Estado" className="flex-1 sm:w-36">
                  {(id) => (
                    <select
                      id={id}
                      className="campo"
                      value={c.estado ?? 'pendiente'}
                      onChange={(e) => setCampo(i, 'estado', e.target.value as EstadoEvidencia)}
                    >
                      {ESTADOS_EVIDENCIA.map((e) => (
                        <option key={e} value={e}>
                          {NOMBRE_ESTADO_EVIDENCIA[e]}
                        </option>
                      ))}
                    </select>
                  )}
                </Campo>
              )}
              <button
                type="button"
                className="boton-fantasma ml-auto p-2.5"
                aria-label={`Quitar ${c.nombre}`}
                onClick={() => actualizar((cs) => void cs.splice(i, 1))}
              >
                <Icono nombre="papelera" tamano={16} />
              </button>
            </div>
            {fuera(c.nota) && (
              <p className="col-span-full text-xs font-semibold text-peligro">
                La nota está fuera de la escala de tu perfil.
              </p>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="boton-secundario"
            onClick={() =>
              actualizar(
                (cs) =>
                  void cs.push({
                    nombre: `${vocab.componente} ${cs.length + 1}`,
                    peso: 0,
                    ...(esEvidencias ? { estado: 'pendiente' as const } : {}),
                  }),
              )
            }
          >
            <Icono nombre="mas" tamano={16} /> Agregar {vocab.componente.toLowerCase()}
          </button>
          <button
            type="button"
            className="boton-fantasma"
            onClick={() =>
              confirmar(
                '¿Reemplazar por los que definiste en las reglas del perfil? Se pierden las notas de esta lista.',
              ) && actualizar((cs) => void cs.splice(0, cs.length, ...cortesIniciales(reglas)))
            }
          >
            Usar los del perfil
          </button>
        </div>
        {reglas.usaNotas && materia.cortes.length > 0 && (
          <p
            className={`text-sm font-semibold tabular-nums ${suma === 100 ? 'text-exito' : 'text-peligro'}`}
          >
            Suma: {String(suma).replace('.', ',')}%{suma !== 100 && ' (debe ser 100%)'}
          </p>
        )}
      </div>
    </Tarjeta>
  );
}

function Temas({ materia, temas }: { materia: Materia; temas: Tema[] }) {
  const [titulo, setTitulo] = useState('');
  const [peso, setPeso] = useState<number | null>(null);
  const suma = sumaPesos(temas.map((t) => ({ peso: t.pesoParcial })));

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) return;
    await guardar('temas', {
      id: nuevoId(),
      materiaId: materia.id,
      titulo: titulo.trim(),
      pesoParcial: Math.min(100, Math.max(0, peso ?? 0)),
      dominio: 0,
    });
    setTitulo('');
    setPeso(null);
  }

  return (
    <Tarjeta titulo="Temas" icono="raiz">
      <p className="mb-4 text-xs text-tinta-suave">
        El peso es cuánto crees que vale cada tema en el próximo examen, de 0 a 100. Con él, Zaviro
        decide dónde rinde más tu hora de estudio.
      </p>
      <ul className="mb-4 flex flex-col divide-y divide-linea/70">
        {temas.map((t) => (
          <li key={t.id} className="flex items-center gap-3 py-2.5">
            <input
              className="campo flex-1 border-transparent bg-transparent px-2 font-semibold hover:border-linea focus:bg-superficie"
              aria-label="Título del tema"
              defaultValue={t.titulo}
              onBlur={(e) =>
                e.target.value.trim() &&
                e.target.value !== t.titulo &&
                void guardar('temas', { ...t, titulo: e.target.value.trim() })
              }
            />
            <div className="relative w-20">
              <NumeroEntrada
                aria-label={`Peso de ${t.titulo}`}
                min={0}
                max={100}
                valor={t.pesoParcial}
                onCambio={(v) =>
                  v !== null &&
                  v >= 0 &&
                  v <= 100 &&
                  void guardar('temas', { ...t, pesoParcial: v })
                }
                className="pr-6"
              />
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-tinta-suave">
                %
              </span>
            </div>
            <div className="hidden w-24 sm:block" title="Dominio">
              <div className="h-1.5 overflow-hidden rounded-full bg-superficie-2">
                <div
                  className="h-full rounded-full bg-exito"
                  style={{ width: `${t.dominio * 100}%` }}
                />
              </div>
              <p className="mt-0.5 text-right text-[11px] font-semibold tabular-nums text-tinta-suave">
                {Math.round(t.dominio * 100)}% dominio
              </p>
            </div>
            <button
              type="button"
              className="boton-fantasma p-2"
              aria-label={`Borrar ${t.titulo}`}
              onClick={() =>
                confirmar(
                  `¿Borrar el tema "${t.titulo}" y sus errores? Los apuntes se conservan.`,
                ) && void borrarTema(t.id)
              }
            >
              <Icono nombre="papelera" tamano={16} />
            </button>
          </li>
        ))}
      </ul>
      {temas.length > 0 && suma !== 100 && (
        <p className="mb-3 text-xs font-semibold text-tinta-suave">
          Los pesos suman {String(suma).replace('.', ',')}%. No es obligatorio que den 100, pero
          ayuda a comparar.
        </p>
      )}
      <form onSubmit={agregar} className="flex flex-wrap gap-2">
        <input
          className="campo min-w-0 flex-[3]"
          placeholder="Nuevo tema"
          aria-label="Título del nuevo tema"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
        />
        <NumeroEntrada
          aria-label="Peso del nuevo tema"
          placeholder="Peso %"
          vacioPermitido
          min={0}
          max={100}
          valor={peso}
          onCambio={setPeso}
          className="w-24 flex-1"
        />
        <button type="submit" className="boton-primario" disabled={!titulo.trim()}>
          Agregar tema
        </button>
      </form>
    </Tarjeta>
  );
}

export function DetalleMateria({
  perfil,
  materia,
  materias,
  temas,
  apuntes,
}: {
  perfil: PerfilAcademico;
  materia: Materia;
  materias: Materia[];
  temas: Tema[];
  apuntes: Apunte[];
}) {
  const [editando, setEditando] = useState(false);
  const vocab = vocabulario(perfil.nivel);
  const horas =
    materia.creditos !== undefined ? horasDeMateria(materia.creditos, perfil.reglas) : null;
  const pendientes = prerrequisitosPendientes(materia, materias);
  const nombresPrerreq = (materia.prerrequisitos ?? [])
    .map((id) => materias.find((m) => m.id === id)?.nombre)
    .filter(Boolean);

  async function borrar() {
    if (
      !confirmar(
        `¿Borrar "${materia.nombre}" con sus temas, apuntes y errores? No se puede deshacer.`,
      )
    )
      return;
    await borrarMateria(materia.id);
    navegar('/materias');
  }

  return (
    <div className="flex flex-col gap-5">
      <a href={hrefDe('/materias')} className="boton-fantasma self-start px-2">
        <Icono nombre="flecha" tamano={16} className="rotate-180" /> {vocab.materias}
      </a>
      <section className="tarjeta animate-aparecer" aria-label={materia.nombre}>
        <div className="flex flex-wrap items-start gap-4">
          <span
            className="h-14 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: materia.color }}
          />
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-extrabold tracking-tight">{materia.nombre}</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="chip">{NOMBRE_TIPO_MATERIA[materia.tipo]}</span>
              <span className="chip">{NOMBRE_ESTADO_MATERIA[materia.estado ?? 'cursando']}</span>
              {materia.creditos !== undefined && perfil.reglas.creditos.activados && (
                <span className="chip">{materia.creditos} créditos</span>
              )}
              {materia.periodoAcademico && <span className="chip">{materia.periodoAcademico}</span>}
              {materia.fechaParcial && (
                <span className="chip">
                  {vocab.parcial[0]!.toUpperCase() + vocab.parcial.slice(1)}:{' '}
                  {fechaCorta(materia.fechaParcial)} ({distanciaDias(materia.fechaParcial)})
                </span>
              )}
            </div>
            {horas && (
              <p className="mt-3 text-sm text-tinta-suave">
                {horas.total} horas de trabajo en el período: {Math.round(horas.conDocente)} con
                docente y {Math.round(horas.independientes)} de trabajo independiente.
              </p>
            )}
            {nombresPrerreq.length > 0 && (
              <p
                className={`mt-2 text-sm ${pendientes.length ? 'font-semibold text-oxido' : 'text-tinta-suave'}`}
              >
                Prerrequisitos: {nombresPrerreq.join(', ')}
                {pendientes.length > 0 &&
                  ` (sin aprobar: ${pendientes.map((p) => p.nombre).join(', ')})`}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" className="boton-secundario" onClick={() => setEditando(true)}>
              Editar
            </button>
            <button
              type="button"
              className="boton-fantasma p-2.5"
              aria-label={`Borrar ${materia.nombre}`}
              onClick={borrar}
            >
              <Icono nombre="papelera" tamano={18} />
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <Temas materia={materia} temas={temas} />
        {perfil.reglas.evaluacion.tipo !== 'hitos' || materia.cortes.length > 0 ? (
          <Cortes perfil={perfil} materia={materia} />
        ) : null}
        <Tarjeta titulo="Apuntes" icono="apuntes" verTodo="/apuntes">
          {apuntes.length === 0 ? (
            <EstadoVacio texto="Todavía no hay apuntes en esta materia." />
          ) : (
            <ul className="flex flex-col gap-2">
              {apuntes.slice(0, 5).map((a) => (
                <li key={a.id}>
                  <a
                    href={hrefDe(`/apuntes/${a.id}`)}
                    className="block rounded-xl border border-linea/70 p-3 hover:bg-superficie-2"
                  >
                    <p className="text-sm font-bold">{a.titulo || 'Sin título'}</p>
                    <p className="truncate text-xs text-tinta-suave">
                      {resumenMarkdown(a.contenido, 90)}
                    </p>
                  </a>
                </li>
              ))}
            </ul>
          )}
          <a href={hrefDe(`/apuntes/nuevo:${materia.id}`)} className="boton-secundario mt-4">
            <Icono nombre="mas" tamano={16} /> Nuevo apunte
          </a>
        </Tarjeta>
      </div>

      <Dialogo
        abierto={editando}
        titulo={`Editar ${materia.nombre}`}
        onCerrar={() => setEditando(false)}
      >
        {editando && (
          <FormMateria
            perfil={perfil}
            inicial={materia}
            todas={materias}
            onListo={() => setEditando(false)}
          />
        )}
      </Dialogo>
    </div>
  );
}
