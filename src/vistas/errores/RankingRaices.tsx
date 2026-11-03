import { useState } from 'react';
import type { PerfilAcademico } from '@/db/esquemas';
import { borrarConcepto } from '@/db/operaciones';
import { guardar } from '@/db/repositorio';
import { NIVELES, NOMBRE_NIVEL, type Nivel } from '@/dominio/catalogo';
import { minutosRepasoBase, puntuarRaices } from '@/dominio/raices';
import { Dialogo } from '@/componentes/Dialogo';
import { Icono } from '@/componentes/Icono';
import { EstadoVacio, Tarjeta } from '@/componentes/Tarjeta';
import { confirmar } from '@/utilidades/confirmar';
import type { DatosErrores } from './datos';

function GestionRaices({ datos }: { datos: DatosErrores }) {
  if (datos.conceptos.length === 0)
    return <EstadoVacio texto="Aún no has creado raíces. Créalas al registrar un error." />;
  return (
    <ul className="flex flex-col gap-3">
      {datos.conceptos.map((c) => {
        const usos = datos.errores.filter((e) => e.conceptoIds.includes(c.id)).length;
        return (
          <li key={c.id} className="flex flex-col gap-2 rounded-xl border border-linea/70 p-3">
            <div className="flex flex-wrap gap-2">
              <input
                className="campo min-w-0 flex-[2] font-semibold"
                aria-label="Nombre de la raíz"
                defaultValue={c.nombre}
                onBlur={(e) =>
                  e.target.value.trim() &&
                  e.target.value !== c.nombre &&
                  void guardar('conceptosRaiz', { ...c, nombre: e.target.value.trim() })
                }
              />
              <select
                className="campo w-auto flex-1"
                aria-label={`Nivel de origen de ${c.nombre}`}
                value={c.nivelOrigen}
                onChange={(e) =>
                  void guardar('conceptosRaiz', { ...c, nivelOrigen: e.target.value as Nivel })
                }
              >
                {NIVELES.map((n) => (
                  <option key={n} value={n}>
                    {NOMBRE_NIVEL[n]}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="boton-fantasma p-2.5"
                aria-label={`Borrar ${c.nombre}`}
                onClick={() =>
                  confirmar(`¿Borrar la raíz "${c.nombre}"? Se quitará de ${usos} errores.`) &&
                  void borrarConcepto(c.id)
                }
              >
                <Icono nombre="papelera" tamano={16} />
              </button>
            </div>
            <input
              className="campo text-xs"
              aria-label={`Descripción de ${c.nombre}`}
              placeholder="Descripción corta (opcional)"
              defaultValue={c.descripcion}
              onBlur={(e) =>
                e.target.value !== c.descripcion &&
                void guardar('conceptosRaiz', { ...c, descripcion: e.target.value })
              }
            />
            <p className="text-xs text-tinta-suave">
              {usos} errores · {c.temaIds.length} temas enlazados
            </p>
          </li>
        );
      })}
    </ul>
  );
}

export function RankingRaices({
  perfil,
  datos,
  limite,
}: {
  perfil: PerfilAcademico;
  datos: DatosErrores;
  limite?: number;
}) {
  const [gestionando, setGestionando] = useState(false);
  const ranking = puntuarRaices({
    conceptos: datos.conceptos,
    errores: datos.errores,
    nivelPorMateria: datos.nivelPorMateria,
  });
  const visibles = limite ? ranking.slice(0, limite) : ranking;
  const max = ranking[0]?.puntaje ?? 1;
  const materia = new Map(datos.materias.map((m) => [m.id, m]));
  const perfilDe = new Map(datos.perfiles.map((p) => [p.id, p]));

  return (
    <Tarjeta titulo="Raíces que más fallan" icono="raiz">
      <p className="mb-4 text-xs text-tinta-suave">
        Cruza los errores de todas tus materias y perfiles. Los recientes y los que no has resuelto
        pesan más. Arreglar una raíz de arriba mejora varias materias a la vez.
      </p>
      {visibles.length === 0 ? (
        <EstadoVacio texto="Cuando registres errores con su raíz, aquí aparecerá el ranking." />
      ) : (
        <ol className="flex flex-col gap-3">
          {visibles.map((r, i) => (
            <li
              key={r.concepto.id}
              className={`rounded-xl border p-3 ${r.basePendiente ? 'border-brillo/60 bg-brillo/10' : 'border-linea/70'}`}
            >
              <div className="flex items-start gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-superficie-2 text-xs font-bold tabular-nums">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{r.concepto.nombre}</p>
                  <p className="text-xs text-tinta-suave">
                    Origen: {NOMBRE_NIVEL[r.concepto.nivelOrigen]} · {r.errores} errores,{' '}
                    {r.noResueltos} sin resolver
                  </p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-superficie-2">
                    <div
                      className="h-full rounded-full bg-oxido"
                      style={{ width: `${(r.puntaje / max) * 100}%` }}
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {r.materiaIds.map((id) => {
                      const m = materia.get(id);
                      const otroPerfil =
                        m && m.perfilId !== perfil.id ? perfilDe.get(m.perfilId) : undefined;
                      return (
                        <span key={id} className="chip gap-1.5">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: m?.color }}
                          />
                          {m?.nombre}
                          {otroPerfil && (
                            <span className="opacity-70">({NOMBRE_NIVEL[otroPerfil.nivel]})</span>
                          )}
                        </span>
                      );
                    })}
                  </div>
                  {r.basePendiente && (
                    <p className="mt-2 text-xs font-semibold text-tinta">
                      Base pendiente de un nivel anterior. Repaso corto sugerido:{' '}
                      {minutosRepasoBase(r)} minutos de {r.concepto.nombre} con ejercicios de{' '}
                      {NOMBRE_NIVEL[r.concepto.nivelOrigen].toLowerCase()}.
                    </p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
      <button
        type="button"
        className="boton-fantasma mt-3 px-0"
        onClick={() => setGestionando(true)}
      >
        Gestionar raíces
      </button>
      <Dialogo
        abierto={gestionando}
        titulo="Conceptos raíz"
        onCerrar={() => setGestionando(false)}
        ancho="max-w-2xl"
      >
        <GestionRaices datos={datos} />
      </Dialogo>
    </Tarjeta>
  );
}
