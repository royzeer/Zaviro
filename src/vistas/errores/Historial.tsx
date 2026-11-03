import { useState } from 'react';
import type { PerfilAcademico } from '@/db/esquemas';
import { borrarError } from '@/db/operaciones';
import { guardar } from '@/db/repositorio';
import { esNivelAnterior, NOMBRE_TIPO_ERROR } from '@/dominio/catalogo';
import { Dialogo } from '@/componentes/Dialogo';
import { FormTarjeta } from '@/componentes/FormTarjeta';
import { Icono } from '@/componentes/Icono';
import { EstadoVacio, Tarjeta } from '@/componentes/Tarjeta';
import { confirmar } from '@/utilidades/confirmar';
import { fechaCorta } from '@/utilidades/fechas';
import type { DatosErrores } from './datos';

export function Historial({ perfil, datos }: { perfil: PerfilAcademico; datos: DatosErrores }) {
  const [materiaId, setMateriaId] = useState('');
  const [estado, setEstado] = useState<'pendientes' | 'resueltos' | 'todos'>('pendientes');
  const [abierto, setAbierto] = useState<string | null>(null);
  const [paraTarjeta, setParaTarjeta] = useState<string | null>(null);
  const conTarjeta = new Set(datos.tarjetasDeErrores);
  const materias = datos.materias.filter((m) => m.perfilId === perfil.id);
  const ids = new Set(materias.map((m) => m.id));
  const materia = new Map(materias.map((m) => [m.id, m]));
  const tema = new Map(datos.temas.map((t) => [t.id, t]));
  const concepto = new Map(datos.conceptos.map((c) => [c.id, c]));
  const lista = datos.errores.filter(
    (e) =>
      ids.has(e.materiaId) &&
      (!materiaId || e.materiaId === materiaId) &&
      (estado === 'todos' || (estado === 'resueltos') === e.resuelto),
  );

  const errorTarjeta = datos.errores.find((e) => e.id === paraTarjeta);
  return (
    <Tarjeta titulo="Historial de errores" icono="apuntes">
      <div className="mb-4 flex flex-wrap gap-2">
        <select
          className="campo w-auto"
          aria-label="Filtrar por materia"
          value={materiaId}
          onChange={(e) => setMateriaId(e.target.value)}
        >
          <option value="">Todas las materias</option>
          {materias.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nombre}
            </option>
          ))}
        </select>
        <div role="group" aria-label="Estado" className="flex gap-1 rounded-xl bg-superficie-2 p-1">
          {(['pendientes', 'resueltos', 'todos'] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={estado === v}
              onClick={() => setEstado(v)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold capitalize ${estado === v ? 'bg-superficie shadow-tarjeta' : 'text-tinta-suave'}`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
      {lista.length === 0 ? (
        <EstadoVacio
          texto={
            estado === 'pendientes'
              ? 'No tienes errores pendientes. Bien.'
              : 'No hay errores con este filtro.'
          }
        />
      ) : (
        <ul className="flex flex-col divide-y divide-linea/70">
          {lista.map((e) => {
            const m = materia.get(e.materiaId);
            const expandido = abierto === e.id;
            return (
              <li key={e.id} className="py-3">
                <div className="flex items-start gap-3">
                  <span
                    className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: m?.color }}
                  />
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    aria-expanded={expandido}
                    onClick={() => setAbierto(expandido ? null : e.id)}
                  >
                    <p
                      className={`text-sm font-bold ${e.resuelto ? 'text-tinta-suave line-through' : ''}`}
                    >
                      {tema.get(e.temaId)?.titulo ?? 'Tema borrado'}
                    </p>
                    <p className="text-xs text-tinta-suave">
                      {m?.nombre} · {NOMBRE_TIPO_ERROR[e.tipo]} · {fechaCorta(e.fecha)}
                    </p>
                    {e.enunciado && !expandido && (
                      <p className="mt-1 truncate text-xs text-tinta-suave">{e.enunciado}</p>
                    )}
                    {e.conceptoIds.length > 0 && (
                      <span className="mt-1.5 flex flex-wrap gap-1">
                        {e.conceptoIds.map((id) => {
                          const c = concepto.get(id);
                          if (!c) return null;
                          return (
                            <span
                              key={id}
                              className={`chip ${esNivelAnterior(c.nivelOrigen, perfil.nivel) ? 'bg-brillo/20 text-tinta' : ''}`}
                            >
                              {c.nombre}
                            </span>
                          );
                        })}
                      </span>
                    )}
                  </button>
                  <div className="flex shrink-0 gap-1">
                    {!conTarjeta.has(e.id) && (
                      <button
                        type="button"
                        className="boton-fantasma px-2.5 py-1.5 text-xs"
                        onClick={() => setParaTarjeta(e.id)}
                      >
                        Tarjeta
                      </button>
                    )}
                    <button
                      type="button"
                      className="boton-secundario px-3 py-1.5 text-xs"
                      onClick={() => void guardar('errores', { ...e, resuelto: !e.resuelto })}
                    >
                      {e.resuelto ? 'Reabrir' : 'Resuelto'}
                    </button>
                    <button
                      type="button"
                      className="boton-fantasma p-2"
                      aria-label="Borrar error"
                      onClick={() => confirmar('¿Borrar este error?') && void borrarError(e.id)}
                    >
                      <Icono nombre="papelera" tamano={16} />
                    </button>
                  </div>
                </div>
                {expandido && (
                  <dl className="mt-3 grid gap-3 rounded-xl bg-superficie-2/60 p-3 text-sm sm:grid-cols-3">
                    <div>
                      <dt className="etiqueta">Enunciado</dt>
                      <dd className="whitespace-pre-wrap">{e.enunciado || 'Sin enunciado'}</dd>
                    </div>
                    <div>
                      <dt className="etiqueta">Mi respuesta</dt>
                      <dd className="whitespace-pre-wrap text-peligro">{e.miRespuesta || '—'}</dd>
                    </div>
                    <div>
                      <dt className="etiqueta">Solución correcta</dt>
                      <dd className="whitespace-pre-wrap text-exito">
                        {e.solucionCorrecta || '—'}
                      </dd>
                    </div>
                  </dl>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <Dialogo
        abierto={Boolean(errorTarjeta)}
        titulo="Tarjeta desde este error"
        onCerrar={() => setParaTarjeta(null)}
      >
        {errorTarjeta && (
          <FormTarjeta
            inicial={{
              origenTipo: 'error',
              origenId: errorTarjeta.id,
              temaId: errorTarjeta.temaId,
              frente:
                errorTarjeta.enunciado ||
                `Resuelve de nuevo: ${tema.get(errorTarjeta.temaId)?.titulo ?? ''}`,
              reverso: errorTarjeta.solucionCorrecta,
            }}
            onListo={() => setParaTarjeta(null)}
          />
        )}
      </Dialogo>
    </Tarjeta>
  );
}
