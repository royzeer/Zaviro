import { useState } from 'react';
import { db } from '@/db/db';
import type { HitoTrabajoGrado, PerfilAcademico } from '@/db/esquemas';
import { guardar, nuevoId } from '@/db/repositorio';
import { Campo } from '@/componentes/Formulario';
import { Icono } from '@/componentes/Icono';
import { EstadoVacio, Tarjeta } from '@/componentes/Tarjeta';
import { ESTADOS_HITO, type EstadoHito } from '@/dominio/catalogo';
import { hitoCumplido, hitosSugeridos, NOMBRE_ESTADO_HITO } from '@/dominio/hitos';
import { confirmar } from '@/utilidades/confirmar';
import { distanciaDias, fechaInputAIso, isoAFechaInput } from '@/utilidades/fechas';

const COLOR_ESTADO: Record<EstadoHito, string> = {
  pendiente: 'bg-superficie-2 text-tinta-suave',
  enCurso: 'bg-brillo/20 text-tinta',
  entregado: 'bg-primario/10 text-primario',
  aprobado: 'bg-exito/15 text-exito',
};

function FilaHito({ hito }: { hito: HitoTrabajoGrado }) {
  const [abierto, setAbierto] = useState(false);
  const actualizar = (cambios: Partial<HitoTrabajoGrado>) => {
    const nuevo = { ...hito, ...cambios };
    if (!nuevo.fecha) delete nuevo.fecha;
    void guardar('hitos', nuevo);
  };
  const atrasado = !hitoCumplido(hito) && hito.fecha && hito.fecha < new Date().toISOString();
  return (
    <li className="rounded-xl border border-linea/70 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          aria-expanded={abierto}
          onClick={() => setAbierto(!abierto)}
        >
          <span className={`block font-bold ${hitoCumplido(hito) ? 'text-tinta-suave' : ''}`}>
            {hito.titulo}
          </span>
          <span
            className={`block text-xs ${atrasado ? 'font-semibold text-peligro' : 'text-tinta-suave'}`}
          >
            {hito.fecha
              ? `${isoAFechaInput(hito.fecha).split('-').reverse().join('/')} · ${distanciaDias(hito.fecha)}`
              : 'Sin fecha'}
            {atrasado ? ' · atrasado' : ''}
          </span>
        </button>
        <span className={`chip ${COLOR_ESTADO[hito.estado]}`}>
          {NOMBRE_ESTADO_HITO[hito.estado]}
        </span>
      </div>
      {abierto && (
        <div className="mt-3 grid gap-3 border-t border-linea/60 pt-3 sm:grid-cols-2">
          <Campo etiqueta="Nombre" className="sm:col-span-2">
            {(id) => (
              <input
                id={id}
                className="campo"
                defaultValue={hito.titulo}
                onBlur={(e) =>
                  e.target.value.trim() && actualizar({ titulo: e.target.value.trim() })
                }
              />
            )}
          </Campo>
          <Campo etiqueta="Fecha de entrega">
            {(id) => (
              <input
                id={id}
                type="date"
                className="campo"
                value={isoAFechaInput(hito.fecha)}
                onChange={(e) => actualizar({ fecha: fechaInputAIso(e.target.value) })}
              />
            )}
          </Campo>
          <Campo etiqueta="Estado">
            {(id) => (
              <select
                id={id}
                className="campo"
                value={hito.estado}
                onChange={(e) => actualizar({ estado: e.target.value as EstadoHito })}
              >
                {ESTADOS_HITO.map((s) => (
                  <option key={s} value={s}>
                    {NOMBRE_ESTADO_HITO[s]}
                  </option>
                ))}
              </select>
            )}
          </Campo>
          <Campo
            etiqueta="Notas"
            className="sm:col-span-2"
            ayuda="Correcciones del director, acuerdos, pendientes."
          >
            {(id, ayuda) => (
              <textarea
                id={id}
                aria-describedby={ayuda}
                className="campo min-h-20"
                defaultValue={hito.notas}
                onBlur={(e) => actualizar({ notas: e.target.value })}
              />
            )}
          </Campo>
          <button
            type="button"
            className="boton-fantasma justify-self-start text-peligro sm:col-span-2"
            onClick={() => {
              if (confirmar(`¿Borrar el hito ${hito.titulo}?`)) void db.hitos.delete(hito.id);
            }}
          >
            <Icono nombre="papelera" tamano={16} /> Borrar hito
          </button>
        </div>
      )}
    </li>
  );
}

export function ListaHitos({
  perfil,
  hitos,
  titulo,
}: {
  perfil: PerfilAcademico;
  hitos: HitoTrabajoGrado[];
  titulo: string;
}) {
  const [nuevo, setNuevo] = useState('');
  const ordenados = [...hitos].sort((a, b) => (a.fecha ?? '9999').localeCompare(b.fecha ?? '9999'));

  async function crear(titulo: string) {
    await guardar('hitos', {
      id: nuevoId(),
      perfilId: perfil.id,
      titulo,
      estado: 'pendiente',
      notas: '',
    });
  }

  return (
    <Tarjeta titulo={titulo} icono="hitos">
      {hitos.length === 0 ? (
        <EstadoVacio
          texto="Aún no tienes hitos. Puedes empezar con los sugeridos para tu nivel y luego ponerles fecha, o crear los tuyos."
          accion={
            <button
              type="button"
              className="boton-secundario"
              onClick={() => void Promise.all(hitosSugeridos(perfil.nivel).map((t) => crear(t)))}
            >
              Crear hitos sugeridos
            </button>
          }
        />
      ) : (
        <>
          <p className="mb-3 text-sm text-tinta-suave">
            Toca un hito para cambiar su fecha, estado o notas.
          </p>
          <ol className="flex flex-col gap-2">
            {ordenados.map((h) => (
              <FilaHito key={h.id} hito={h} />
            ))}
          </ol>
        </>
      )}
      <form
        className="mt-4 flex gap-2 border-t border-linea/60 pt-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!nuevo.trim()) return;
          void crear(nuevo.trim());
          setNuevo('');
        }}
      >
        <label htmlFor="nuevo-hito" className="sr-only">
          Nuevo hito
        </label>
        <input
          id="nuevo-hito"
          className="campo flex-1"
          placeholder="Nuevo hito, por ejemplo Entrega al jurado"
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
        />
        <button type="submit" className="boton-primario" disabled={!nuevo.trim()}>
          Agregar
        </button>
      </form>
    </Tarjeta>
  );
}
