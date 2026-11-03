import { useState } from 'react';
import { navegar } from '@/app/enrutador';
import { db } from '@/db/db';
import type { Lectura } from '@/db/esquemas';
import { guardar } from '@/db/repositorio';
import { Campo } from '@/componentes/Formulario';
import { Icono } from '@/componentes/Icono';
import { Tarjeta } from '@/componentes/Tarjeta';
import { ESTADOS_LECTURA, type EstadoLectura } from '@/dominio/catalogo';
import { NOMBRE_ESTADO_LECTURA } from '@/dominio/lecturas';
import { confirmar } from '@/utilidades/confirmar';

export function DetalleLectura({ lectura }: { lectura: Lectura }) {
  const [cita, setCita] = useState({ texto: '', pagina: '', fuente: '' });
  const actualizar = (cambios: Partial<Lectura>) =>
    void guardar('lecturas', { ...lectura, ...cambios });

  function agregarCita(e: React.FormEvent) {
    e.preventDefault();
    if (!cita.texto.trim()) return;
    actualizar({
      citas: [
        ...lectura.citas,
        {
          texto: cita.texto.trim(),
          fuente: cita.fuente.trim(),
          ...(cita.pagina.trim() ? { pagina: cita.pagina.trim() } : {}),
        },
      ],
    });
    setCita({ texto: '', pagina: '', fuente: '' });
  }

  return (
    <Tarjeta titulo="Detalle de la lectura" icono="lecturas">
      <div key={lectura.id} className="flex flex-col gap-4">
        <Campo etiqueta="Referencia">
          {(id) => (
            <textarea
              id={id}
              className="campo min-h-16"
              defaultValue={lectura.referencia}
              onBlur={(e) =>
                e.target.value.trim() && actualizar({ referencia: e.target.value.trim() })
              }
            />
          )}
        </Campo>
        <fieldset>
          <legend className="etiqueta">Estado</legend>
          <div className="flex gap-1 rounded-xl bg-superficie-2 p-1">
            {ESTADOS_LECTURA.map((s: EstadoLectura) => (
              <button
                key={s}
                type="button"
                aria-pressed={lectura.estado === s}
                onClick={() => actualizar({ estado: s })}
                className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold ${
                  lectura.estado === s
                    ? 'bg-superficie shadow-tarjeta'
                    : 'text-tinta-suave hover:text-tinta'
                }`}
              >
                {NOMBRE_ESTADO_LECTURA[s]}
              </button>
            ))}
          </div>
        </fieldset>
        <Campo
          etiqueta="Notas de lectura"
          ayuda="Ideas principales, cómo se relaciona con tu trabajo, preguntas que te deja."
        >
          {(id, ayuda) => (
            <textarea
              id={id}
              aria-describedby={ayuda}
              className="campo min-h-28"
              defaultValue={lectura.notas}
              onBlur={(e) => actualizar({ notas: e.target.value })}
            />
          )}
        </Campo>

        <div>
          <p className="etiqueta">Citas ({lectura.citas.length})</p>
          {lectura.citas.length > 0 && (
            <ul className="mb-3 flex flex-col gap-2">
              {lectura.citas.map((c, i) => (
                <li
                  key={i}
                  className="flex gap-2 rounded-xl border-l-4 border-acento bg-superficie-2/60 py-2 pl-3 pr-1 text-sm"
                >
                  <span className="flex-1">
                    <span className="italic">“{c.texto}”</span>
                    <span className="block text-xs text-tinta-suave">
                      {c.fuente || 'Misma referencia'}
                      {c.pagina ? `, p. ${c.pagina}` : ''}
                    </span>
                  </span>
                  <button
                    type="button"
                    className="boton-fantasma self-start p-1.5"
                    aria-label="Borrar cita"
                    onClick={() => {
                      if (confirmar('¿Borrar esta cita?'))
                        actualizar({ citas: lectura.citas.filter((_, j) => j !== i) });
                    }}
                  >
                    <Icono nombre="papelera" tamano={15} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <form
            onSubmit={agregarCita}
            className="grid gap-2 rounded-xl border border-dashed border-linea p-3 sm:grid-cols-[1fr_6rem]"
          >
            <label className="sr-only" htmlFor="cita-texto">
              Texto de la cita
            </label>
            <textarea
              id="cita-texto"
              className="campo min-h-16 sm:col-span-2"
              placeholder="Copia la cita textual"
              value={cita.texto}
              onChange={(e) => setCita({ ...cita, texto: e.target.value })}
            />
            <label className="sr-only" htmlFor="cita-fuente">
              Fuente
            </label>
            <input
              id="cita-fuente"
              className="campo"
              placeholder="Fuente (si es distinta a la referencia)"
              value={cita.fuente}
              onChange={(e) => setCita({ ...cita, fuente: e.target.value })}
            />
            <label className="sr-only" htmlFor="cita-pagina">
              Página
            </label>
            <input
              id="cita-pagina"
              className="campo"
              placeholder="Página"
              value={cita.pagina}
              onChange={(e) => setCita({ ...cita, pagina: e.target.value })}
            />
            <button
              type="submit"
              className="boton-secundario sm:col-span-2 sm:justify-self-end"
              disabled={!cita.texto.trim()}
            >
              Guardar cita
            </button>
          </form>
        </div>

        <button
          type="button"
          className="boton-fantasma self-start text-peligro"
          onClick={() => {
            if (!confirmar('¿Borrar esta lectura con sus notas y citas?')) return;
            void db.lecturas.delete(lectura.id).then(() => navegar('/lecturas'));
          }}
        >
          <Icono nombre="papelera" tamano={16} /> Borrar lectura
        </button>
      </div>
    </Tarjeta>
  );
}
