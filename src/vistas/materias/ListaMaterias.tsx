import { useState } from 'react';
import { hrefDe, navegar } from '@/app/enrutador';
import type { Materia, PerfilAcademico, Tema } from '@/db/esquemas';
import { NOMBRE_ESTADO_MATERIA, NOMBRE_TIPO_MATERIA } from '@/dominio/catalogo';
import { avanceCreditos, prerrequisitosPendientes } from '@/dominio/creditos';
import { vocabulario } from '@/dominio/niveles';
import { Dialogo } from '@/componentes/Dialogo';
import { Icono } from '@/componentes/Icono';
import { EstadoVacio, Tarjeta } from '@/componentes/Tarjeta';
import { distanciaDias, fechaCorta } from '@/utilidades/fechas';
import { FormMateria } from './FormMateria';
import { materiaNueva } from './materiaNueva';

function TarjetaCreditos({ perfil, materias }: { perfil: PerfilAcademico; materias: Materia[] }) {
  const a = avanceCreditos(materias, perfil.creditosPrograma);
  return (
    <Tarjeta titulo="Créditos" icono="saber" className="md:col-span-2 xl:col-span-3">
      <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
        <div>
          <p className="text-3xl font-extrabold tabular-nums">
            {a.aprobados}
            {a.total !== undefined && (
              <span className="text-lg font-bold text-tinta-suave"> / {a.total}</span>
            )}
          </p>
          <p className="text-xs font-semibold text-tinta-suave">créditos aprobados</p>
        </div>
        <div>
          <p className="text-xl font-bold tabular-nums">{a.cursando}</p>
          <p className="text-xs font-semibold text-tinta-suave">cursando ahora</p>
        </div>
        {a.faltan !== undefined && (
          <div>
            <p className="text-xl font-bold tabular-nums">{a.faltan}</p>
            <p className="text-xs font-semibold text-tinta-suave">te faltan para graduarte</p>
          </div>
        )}
      </div>
      {a.porcentaje !== undefined ? (
        <div
          className="mt-4 h-2 overflow-hidden rounded-full bg-superficie-2"
          role="progressbar"
          aria-valuenow={Math.round(a.porcentaje * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Avance del programa"
        >
          <div
            className="h-full rounded-full bg-exito"
            style={{ width: `${a.porcentaje * 100}%` }}
          />
        </div>
      ) : (
        <p className="mt-3 text-xs text-tinta-suave">
          Agrega el total de créditos del programa en{' '}
          <a className="font-semibold underline" href={hrefDe('/perfil')}>
            tu perfil
          </a>{' '}
          para ver cuánto te falta.
        </p>
      )}
    </Tarjeta>
  );
}

export function ListaMaterias({
  perfil,
  materias,
  temas,
}: {
  perfil: PerfilAcademico;
  materias: Materia[];
  temas: Tema[];
}) {
  const [creando, setCreando] = useState(false);
  const vocab = vocabulario(perfil.nivel);

  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      <div className="flex flex-wrap items-center justify-between gap-3 md:col-span-2 xl:col-span-3">
        <p className="text-sm text-tinta-suave">
          {materias.length === 0
            ? `Aún no tienes ${vocab.materias.toLowerCase()}.`
            : `${materias.length} en este perfil.`}
        </p>
        <button type="button" className="boton-primario" onClick={() => setCreando(true)}>
          <Icono nombre="mas" tamano={16} /> {vocab.nuevaMateria}
        </button>
      </div>

      {perfil.reglas.creditos.activados && materias.length > 0 && (
        <TarjetaCreditos perfil={perfil} materias={materias} />
      )}

      {materias.length === 0 && (
        <div className="md:col-span-2 xl:col-span-3">
          <EstadoVacio
            texto={`Empieza con «${vocab.nuevaMateria}» para agregarle temas, ${vocab.componentes.toLowerCase()} y apuntes.`}
          />
        </div>
      )}

      {materias.map((m) => {
        const susTemas = temas.filter((t) => t.materiaId === m.id);
        const pendientes = prerrequisitosPendientes(m, materias);
        const dominio = susTemas.length
          ? susTemas.reduce((s, t) => s + t.dominio, 0) / susTemas.length
          : 0;
        return (
          <a
            key={m.id}
            href={hrefDe(`/materias/${m.id}`)}
            className="tarjeta group flex animate-aparecer flex-col gap-4 transition-shadow hover:shadow-flotante"
          >
            <div className="flex items-start gap-3">
              <span
                className="mt-1 h-10 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: m.color }}
              />
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-base font-bold">{m.nombre}</h2>
                <p className="text-xs text-tinta-suave">
                  {NOMBRE_TIPO_MATERIA[m.tipo]}
                  {m.creditos !== undefined &&
                    perfil.reglas.creditos.activados &&
                    ` · ${m.creditos} créditos`}
                  {m.periodoAcademico && ` · ${m.periodoAcademico}`}
                </p>
              </div>
              <span className="chip">{NOMBRE_ESTADO_MATERIA[m.estado ?? 'cursando']}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-xl bg-superficie-2 px-3 py-2">
                <p className="text-xs font-semibold text-tinta-suave">Temas</p>
                <p className="font-bold tabular-nums">{susTemas.length}</p>
              </div>
              <div className="rounded-xl bg-superficie-2 px-3 py-2">
                <p className="text-xs font-semibold text-tinta-suave">Próximo {vocab.parcial}</p>
                <p className="truncate font-bold">
                  {m.fechaParcial
                    ? `${fechaCorta(m.fechaParcial)} (${distanciaDias(m.fechaParcial)})`
                    : 'Sin fecha'}
                </p>
              </div>
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs font-semibold text-tinta-suave">
                <span>Dominio promedio</span>
                <span className="tabular-nums">{Math.round(dominio * 100)}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-superficie-2">
                <div
                  className="h-full rounded-full bg-exito"
                  style={{ width: `${dominio * 100}%` }}
                />
              </div>
            </div>
            {pendientes.length > 0 && (
              <p className="text-xs font-semibold text-oxido">
                Prerrequisito sin aprobar: {pendientes.map((p) => p.nombre).join(', ')}
              </p>
            )}
          </a>
        );
      })}

      <Dialogo abierto={creando} titulo={vocab.nuevaMateria} onCerrar={() => setCreando(false)}>
        {creando && (
          <FormMateria
            perfil={perfil}
            inicial={materiaNueva(perfil, materias.length)}
            todas={materias}
            onListo={(m) => {
              setCreando(false);
              navegar(`/materias/${m.id}`);
            }}
          />
        )}
      </Dialogo>
    </div>
  );
}
