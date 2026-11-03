import { useState } from 'react';
import type { Materia, PerfilAcademico } from '@/db/esquemas';
import { COLORES_MATERIA } from '@/db/operaciones';
import { guardar } from '@/db/repositorio';
import {
  ESTADOS_MATERIA,
  NOMBRE_ESTADO_MATERIA,
  NOMBRE_TIPO_MATERIA,
  TIPOS_MATERIA,
  type TipoMateria,
} from '@/dominio/catalogo';
import { creaCiclo } from '@/dominio/creditos';
import { horasDeMateria, vocabulario } from '@/dominio/niveles';
import { Campo, NumeroEntrada } from '@/componentes/Formulario';
import { fechaInputAIso, isoAFechaInput } from '@/utilidades/fechas';

export function FormMateria({
  perfil,
  inicial,
  todas,
  onListo,
}: {
  perfil: PerfilAcademico;
  inicial: Materia;
  todas: Materia[];
  onListo: (m: Materia) => void;
}) {
  const [m, setM] = useState<Materia>(inicial);
  const [error, setError] = useState('');
  const vocab = vocabulario(perfil.nivel);
  const { reglas } = perfil;
  const horas = m.creditos !== undefined ? horasDeMateria(m.creditos, reglas) : null;
  const otras = todas.filter((x) => x.id !== m.id);
  const conPrerrequisitos = perfil.nivel === 'profesional' || reglas.creditos.activados;

  function set<K extends keyof Materia>(k: K, v: Materia[K] | undefined) {
    setM((prev) => {
      const copia = { ...prev };
      if (v === undefined || v === '') delete copia[k];
      else copia[k] = v as Materia[K];
      return copia;
    });
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!m.nombre.trim())
      return setError(`Escribe el nombre de la ${vocab.materia.toLowerCase()}.`);
    try {
      const guardada = await guardar('materias', { ...m, nombre: m.nombre.trim() });
      onListo(guardada);
    } catch {
      setError('Hay datos que no son válidos. Revisa los campos.');
    }
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      <Campo etiqueta="Nombre">
        {(id) => (
          <input
            id={id}
            className="campo"
            autoFocus
            value={m.nombre}
            onChange={(e) => set('nombre', e.target.value)}
            placeholder="Por ejemplo, Cálculo integral"
          />
        )}
      </Campo>

      <fieldset>
        <legend className="etiqueta">Color</legend>
        <div className="flex flex-wrap gap-2">
          {COLORES_MATERIA.map((c) => (
            <label
              key={c}
              className="cursor-pointer rounded-full has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-acento has-[:focus-visible]:ring-offset-2"
            >
              <input
                type="radio"
                name="color"
                value={c}
                checked={m.color === c}
                onChange={() => set('color', c)}
                className="sr-only"
                aria-label={`Color ${c}`}
              />
              <span
                className={`block h-8 w-8 rounded-full border-2 ${m.color === c ? 'border-tinta' : 'border-transparent'}`}
                style={{ backgroundColor: c }}
              />
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo etiqueta="Tipo" ayuda="Cambia las plantillas de estudio y de ejemplos.">
          {(id, idAyuda) => (
            <select
              id={id}
              aria-describedby={idAyuda}
              className="campo"
              value={m.tipo}
              onChange={(e) => set('tipo', e.target.value as TipoMateria)}
            >
              {TIPOS_MATERIA.map((t) => (
                <option key={t} value={t}>
                  {NOMBRE_TIPO_MATERIA[t]}
                </option>
              ))}
            </select>
          )}
        </Campo>
        <Campo etiqueta="Estado">
          {(id) => (
            <select
              id={id}
              className="campo"
              value={m.estado ?? 'cursando'}
              onChange={(e) => set('estado', e.target.value as Materia['estado'])}
            >
              {ESTADOS_MATERIA.map((t) => (
                <option key={t} value={t}>
                  {NOMBRE_ESTADO_MATERIA[t]}
                </option>
              ))}
            </select>
          )}
        </Campo>
        {reglas.creditos.activados && (
          <Campo
            etiqueta="Créditos"
            ayuda={
              horas
                ? `${horas.total} h en el período: ${Math.round(horas.conDocente)} con docente y ${Math.round(horas.independientes)} de trabajo independiente.`
                : 'Están en el plan de estudios.'
            }
          >
            {(id, idAyuda) => (
              <NumeroEntrada
                id={id}
                aria-describedby={idAyuda}
                vacioPermitido
                min={0}
                valor={m.creditos}
                onCambio={(v) => set('creditos', v ?? undefined)}
              />
            )}
          </Campo>
        )}
        <Campo etiqueta={`Fecha del próximo ${vocab.parcial}`}>
          {(id) => (
            <input
              id={id}
              type="date"
              className="campo"
              value={isoAFechaInput(m.fechaParcial)}
              onChange={(e) => set('fechaParcial', fechaInputAIso(e.target.value))}
            />
          )}
        </Campo>
        <Campo
          etiqueta="Período académico"
          ayuda="Por ejemplo 2026-2. Sirve para el promedio semestral."
        >
          {(id, idAyuda) => (
            <input
              id={id}
              aria-describedby={idAyuda}
              className="campo"
              value={m.periodoAcademico ?? ''}
              onChange={(e) => set('periodoAcademico', e.target.value)}
            />
          )}
        </Campo>
        {reglas.usaNotas && (m.estado === 'aprobada' || m.estado === 'reprobada') && (
          <Campo etiqueta="Nota final" ayuda="La que quedó en el sistema de tu institución.">
            {(id, idAyuda) => (
              <NumeroEntrada
                id={id}
                aria-describedby={idAyuda}
                vacioPermitido
                min={reglas.escala.minimo}
                max={reglas.escala.maximo}
                valor={m.notaFinal}
                onCambio={(v) => set('notaFinal', v ?? undefined)}
              />
            )}
          </Campo>
        )}
      </div>

      {conPrerrequisitos && otras.length > 0 && (
        <fieldset>
          <legend className="etiqueta">Prerrequisitos</legend>
          <div className="flex flex-wrap gap-2">
            {otras.map((o) => {
              const marcado = m.prerrequisitos?.includes(o.id) ?? false;
              const ciclo = !marcado && creaCiclo(m.id, o.id, [...otras, m]);
              return (
                <label
                  key={o.id}
                  title={ciclo ? 'Crearía un ciclo de prerrequisitos' : undefined}
                  className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-acento ${marcado ? 'border-primario bg-superficie-2' : 'border-linea'} ${ciclo ? 'opacity-50' : 'cursor-pointer'}`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    disabled={ciclo}
                    checked={marcado}
                    onChange={() =>
                      set(
                        'prerrequisitos',
                        marcado
                          ? m.prerrequisitos?.filter((p) => p !== o.id)
                          : [...(m.prerrequisitos ?? []), o.id],
                      )
                    }
                  />
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: o.color }} />
                  {o.nombre}
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      {error && (
        <p className="text-sm text-peligro" role="alert">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <button type="submit" className="boton-primario">
          Guardar
        </button>
      </div>
    </form>
  );
}
