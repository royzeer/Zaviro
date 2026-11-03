import { useEffect, useState } from 'react';
import { navegar } from '@/app/enrutador';
import type { PerfilAcademico } from '@/db/esquemas';
import { activarPerfil, borrarPerfil } from '@/db/operaciones';
import { guardar } from '@/db/repositorio';
import {
  AREAS,
  NIVELES,
  NOMBRE_AREA,
  NOMBRE_MODULO,
  NOMBRE_NIVEL,
  type Nivel,
} from '@/dominio/catalogo';
import {
  modulosDisponibles,
  modulosSugeridos,
  reglasSugeridas,
  revisarReglas,
} from '@/dominio/niveles';
import { usePerfil } from '@/estado/usePerfil';
import { confirmar } from '@/utilidades/confirmar';
import { EditorReglas } from '@/componentes/EditorReglas';
import { Campo, NumeroEntrada } from '@/componentes/Formulario';
import { Icono } from '@/componentes/Icono';
import { Tarjeta } from '@/componentes/Tarjeta';
import { nombrePerfil } from '@/dominio/perfil';

export function Perfil() {
  const { perfil, perfiles } = usePerfil();
  const [borrador, setBorrador] = useState<PerfilAcademico | null>(null);
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    setBorrador(perfil ? structuredClone(perfil) : null);
    setMensaje('');
  }, [perfil]);

  if (!perfil || !borrador) return null;
  const avisos = revisarReglas(borrador.reglas);
  const cambiado = JSON.stringify(borrador) !== JSON.stringify(perfil);

  function cambiarNivel(nivel: Nivel) {
    setBorrador((b) => {
      if (!b) return b;
      const disponibles = modulosDisponibles(nivel);
      return {
        ...b,
        nivel,
        modulosActivos: b.modulosActivos.filter((m) => disponibles.includes(m)),
      };
    });
  }

  async function guardarCambios() {
    if (!borrador) return;
    try {
      await guardar('perfiles', borrador);
      setMensaje('Cambios guardados.');
    } catch {
      setMensaje('Revisa los valores marcados: hay datos que no son válidos.');
    }
  }

  async function borrar(p: PerfilAcademico) {
    if (
      !confirmar(
        `¿Borrar el perfil "${nombrePerfil(p)}" con todas sus materias, temas, apuntes y errores? No se puede deshacer.`,
      )
    )
      return;
    await borrarPerfil(p.id);
    if (perfiles.length <= 1) navegar('/');
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_22rem]">
      <div className="flex flex-col gap-5">
        <Tarjeta titulo="Datos del perfil" icono="perfil">
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo
              etiqueta="Nivel"
              ayuda="Cambiar el nivel no borra nada. Las reglas se conservan hasta que apliques las sugeridas."
            >
              {(id, idAyuda) => (
                <select
                  id={id}
                  aria-describedby={idAyuda}
                  className="campo"
                  value={borrador.nivel}
                  onChange={(e) => cambiarNivel(e.target.value as Nivel)}
                >
                  {NIVELES.map((n) => (
                    <option key={n} value={n}>
                      {NOMBRE_NIVEL[n]}
                    </option>
                  ))}
                </select>
              )}
            </Campo>
            <Campo etiqueta="Área">
              {(id) => (
                <select
                  id={id}
                  className="campo"
                  value={borrador.area}
                  onChange={(e) =>
                    setBorrador({ ...borrador, area: e.target.value as PerfilAcademico['area'] })
                  }
                >
                  {AREAS.map((a) => (
                    <option key={a} value={a}>
                      {NOMBRE_AREA[a]}
                    </option>
                  ))}
                </select>
              )}
            </Campo>
            <Campo etiqueta="Institución">
              {(id) => (
                <input
                  id={id}
                  className="campo"
                  value={borrador.institucion}
                  onChange={(e) => setBorrador({ ...borrador, institucion: e.target.value })}
                />
              )}
            </Campo>
            <Campo etiqueta="Programa">
              {(id) => (
                <input
                  id={id}
                  className="campo"
                  value={borrador.programa ?? ''}
                  onChange={(e) => setBorrador({ ...borrador, programa: e.target.value })}
                />
              )}
            </Campo>
            {borrador.reglas.creditos.activados && (
              <Campo
                etiqueta="Créditos del programa"
                ayuda="Total de créditos para graduarte, según el plan de estudios."
              >
                {(id, idAyuda) => (
                  <NumeroEntrada
                    id={id}
                    aria-describedby={idAyuda}
                    vacioPermitido
                    valor={borrador.creditosPrograma}
                    onCambio={(v) => {
                      const { creditosPrograma: _, ...resto } = borrador;
                      setBorrador(
                        v === null ? resto : { ...resto, creditosPrograma: Math.round(v) },
                      );
                    }}
                  />
                )}
              </Campo>
            )}
          </div>
          {borrador.nivel !== perfil.nivel && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-superficie-2 p-3 text-sm">
              <p>
                ¿Quieres usar las reglas y módulos sugeridos para{' '}
                {NOMBRE_NIVEL[borrador.nivel].toLowerCase()}?
              </p>
              <button
                type="button"
                className="boton-secundario"
                onClick={() =>
                  setBorrador({
                    ...borrador,
                    reglas: reglasSugeridas(borrador.nivel),
                    modulosActivos: modulosSugeridos(borrador.nivel),
                  })
                }
              >
                Aplicar sugeridas
              </button>
            </div>
          )}
        </Tarjeta>

        <Tarjeta titulo="Reglas académicas" icono="notas">
          <EditorReglas
            nivel={borrador.nivel}
            reglas={borrador.reglas}
            onCambio={(reglas) => setBorrador({ ...borrador, reglas })}
          />
        </Tarjeta>

        <Tarjeta titulo="Módulos activos" icono="ajustes">
          <div className="grid gap-2 sm:grid-cols-2">
            {modulosDisponibles(borrador.nivel).map((m) => {
              const activo = borrador.modulosActivos.includes(m);
              return (
                <label
                  key={m}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-acento ${activo ? 'border-primario bg-superficie-2' : 'border-linea'}`}
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[rgb(var(--primario))]"
                    checked={activo}
                    onChange={() =>
                      setBorrador({
                        ...borrador,
                        modulosActivos: activo
                          ? borrador.modulosActivos.filter((x) => x !== m)
                          : [...borrador.modulosActivos, m],
                      })
                    }
                  />
                  {NOMBRE_MODULO[m]}
                </label>
              );
            })}
          </div>
        </Tarjeta>

        <div className="sticky bottom-24 z-10 flex flex-wrap items-center justify-end gap-3 rounded-2xl border border-linea bg-superficie/95 p-3 shadow-flotante backdrop-blur lg:bottom-4">
          <p className="mr-auto text-sm text-tinta-suave" role="status">
            {mensaje || (cambiado ? 'Tienes cambios sin guardar.' : 'Todo está guardado.')}
          </p>
          <button
            type="button"
            className="boton-fantasma"
            disabled={!cambiado}
            onClick={() => setBorrador(structuredClone(perfil))}
          >
            Descartar
          </button>
          <button
            type="button"
            className="boton-primario"
            disabled={!cambiado || avisos.length > 0}
            onClick={guardarCambios}
          >
            Guardar cambios
          </button>
        </div>
      </div>

      <Tarjeta titulo="Tus perfiles" icono="materias" className="self-start">
        <ul className="flex flex-col gap-2">
          {perfiles.map((p) => (
            <li
              key={p.id}
              className={`flex items-center gap-3 rounded-xl border p-3 ${p.id === perfil.id ? 'border-primario bg-superficie-2' : 'border-linea'}`}
            >
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => activarPerfil(p.id)}
                aria-current={p.id === perfil.id ? 'true' : undefined}
              >
                <span className="block truncate text-sm font-bold">{nombrePerfil(p)}</span>
                <span className="block text-xs text-tinta-suave">
                  {NOMBRE_NIVEL[p.nivel]}
                  {p.esEjemplo ? ' · ejemplo' : ''}
                </span>
              </button>
              <button
                type="button"
                className="boton-fantasma p-2"
                aria-label={`Borrar perfil ${nombrePerfil(p)}`}
                onClick={() => borrar(p)}
              >
                <Icono nombre="papelera" tamano={16} />
              </button>
            </li>
          ))}
        </ul>
        <a href="#/nuevo-perfil" className="boton-secundario mt-4 w-full">
          <Icono nombre="mas" tamano={16} /> Nuevo perfil
        </a>
      </Tarjeta>
    </div>
  );
}
