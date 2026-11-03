import { useState } from 'react';
import { navegar } from '@/app/enrutador';
import type { EjemploResuelto, FuerzaGuardada, Tema } from '@/db/esquemas';
import { guardar, nuevoId } from '@/db/repositorio';
import { Avisos, Campo, Interruptor, NumeroEntrada } from '@/componentes/Formulario';
import { Icono } from '@/componentes/Icono';
import { Tarjeta } from '@/componentes/Tarjeta';
import { DiagramaCuerpoLibre } from '@/componentes/DiagramaCuerpoLibre';
import { num } from '@/dominio/ejemplos';
import { NOMBRE_TIPO_FUERZA, resultante, TIPOS_FUERZA, type TipoFuerza } from '@/dominio/fuerzas';

type Diagrama = NonNullable<EjemploResuelto['diagrama']>;

const DIAGRAMA_INICIAL: Diagrama = {
  cuerpo: 'particula',
  inclinacion: 0,
  fuerzas: [{ nombre: 'W', tipo: 'peso', magnitud: 100, angulo: 270, unidad: 'N' }],
};

export function FormEjemplo({
  temas,
  inicial,
  temaPorDefecto,
}: {
  temas: (Tema & { materia: string })[];
  inicial?: EjemploResuelto | undefined;
  temaPorDefecto?: string | undefined;
}) {
  const [e, setE] = useState<EjemploResuelto>(
    () =>
      inicial ?? {
        id: nuevoId(),
        temaId: temaPorDefecto ?? temas[0]?.id ?? '',
        titulo: '',
        enunciado: '',
        pasos: [{ descripcion: '' }],
        comprobacion: '',
      },
  );
  const [avisos, setAvisos] = useState<string[]>([]);
  const set = <K extends keyof EjemploResuelto>(k: K, v: EjemploResuelto[K]) =>
    setE((x) => ({ ...x, [k]: v }));
  const setPaso = (i: number, k: 'descripcion' | 'calculo' | 'valor', v: string) =>
    set(
      'pasos',
      e.pasos.map((p, j) => (j === i ? { ...p, [k]: v } : p)),
    );
  const diagrama = e.diagrama;
  const setDiagrama = (d: Partial<Diagrama>) =>
    set('diagrama', { ...(diagrama ?? DIAGRAMA_INICIAL), ...d });
  const setFuerza = (i: number, f: Partial<FuerzaGuardada>) =>
    diagrama &&
    setDiagrama({ fuerzas: diagrama.fuerzas.map((x, j) => (j === i ? { ...x, ...f } : x)) });
  const R = diagrama ? resultante(diagrama.fuerzas) : null;

  async function enviar(ev: React.FormEvent) {
    ev.preventDefault();
    const faltan: string[] = [];
    if (!e.temaId) faltan.push('Elige el tema del ejemplo.');
    if (!e.titulo.trim()) faltan.push('Ponle un título.');
    const pasos = e.pasos
      .map((p) => ({
        descripcion: p.descripcion.trim(),
        ...(p.calculo?.trim() ? { calculo: p.calculo.trim() } : {}),
        ...(p.valor?.trim() ? { valor: p.valor.trim() } : {}),
      }))
      .filter((p) => p.descripcion || p.calculo || p.valor);
    if (pasos.length === 0) faltan.push('Escribe al menos un paso.');
    if (pasos.some((p) => !p.descripcion))
      faltan.push('Explica cada paso con palabras, no solo con la fórmula.');
    if (diagrama && diagrama.fuerzas.some((f) => !f.nombre.trim()))
      faltan.push('Cada fuerza necesita un nombre, por ejemplo T1 o W.');
    setAvisos(faltan);
    if (faltan.length) return;
    const limpio: EjemploResuelto = { ...e, titulo: e.titulo.trim(), pasos };
    if (!limpio.diagrama) delete limpio.diagrama;
    await guardar('ejemplos', limpio);
    navegar(`/ejemplos/${e.id}`);
  }

  return (
    <Tarjeta titulo={inicial ? 'Editar ejemplo' : 'Nuevo ejemplo resuelto'} icono="ejemplos">
      <form onSubmit={(ev) => void enviar(ev)} className="flex flex-col gap-4" noValidate>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo etiqueta="Tema">
            {(id) => (
              <select
                id={id}
                className="campo"
                value={e.temaId}
                onChange={(ev) => set('temaId', ev.target.value)}
              >
                {temas.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.materia} · {t.titulo}
                  </option>
                ))}
              </select>
            )}
          </Campo>
          <Campo etiqueta="Título">
            {(id) => (
              <input
                id={id}
                className="campo"
                value={e.titulo}
                onChange={(ev) => set('titulo', ev.target.value)}
              />
            )}
          </Campo>
        </div>
        <Campo etiqueta="Enunciado">
          {(id) => (
            <textarea
              id={id}
              className="campo min-h-20"
              value={e.enunciado}
              onChange={(ev) => set('enunciado', ev.target.value)}
            />
          )}
        </Campo>

        <fieldset className="flex flex-col gap-3">
          <legend className="etiqueta">Pasos</legend>
          <p className="-mt-1 text-xs text-tinta-suave">
            En cada paso explica qué haces y por qué; luego el cálculo o despeje y el resultado con
            su unidad.
          </p>
          {e.pasos.map((p, i) => (
            <div
              key={i}
              className="grid gap-2 rounded-xl border border-linea/70 p-3 sm:grid-cols-[1fr_1fr_auto]"
            >
              <label className="sr-only" htmlFor={`paso-${i}`}>
                Paso {i + 1}: explicación
              </label>
              <textarea
                id={`paso-${i}`}
                className="campo min-h-14 sm:col-span-3"
                placeholder={`Paso ${i + 1}: qué haces y por qué`}
                value={p.descripcion}
                onChange={(ev) => setPaso(i, 'descripcion', ev.target.value)}
              />
              <label className="sr-only" htmlFor={`calculo-${i}`}>
                Paso {i + 1}: cálculo o despeje
              </label>
              <input
                id={`calculo-${i}`}
                className="campo font-mono text-[13px]"
                placeholder="Cálculo o despeje, por ejemplo N = W · cos 30°"
                value={p.calculo ?? ''}
                onChange={(ev) => setPaso(i, 'calculo', ev.target.value)}
              />
              <label className="sr-only" htmlFor={`valor-${i}`}>
                Paso {i + 1}: resultado
              </label>
              <input
                id={`valor-${i}`}
                className="campo"
                placeholder="Resultado con unidad"
                value={p.valor ?? ''}
                onChange={(ev) => setPaso(i, 'valor', ev.target.value)}
              />
              <button
                type="button"
                className="boton-fantasma p-2"
                aria-label={`Quitar el paso ${i + 1}`}
                disabled={e.pasos.length === 1}
                onClick={() =>
                  set(
                    'pasos',
                    e.pasos.filter((_, j) => j !== i),
                  )
                }
              >
                <Icono nombre="papelera" tamano={16} />
              </button>
            </div>
          ))}
          <button
            type="button"
            className="boton-secundario self-start"
            onClick={() => set('pasos', [...e.pasos, { descripcion: '' }])}
          >
            Agregar paso
          </button>
        </fieldset>

        <Campo
          etiqueta="Comprobación"
          ayuda="Cómo sabes que el resultado está bien: reemplaza, revisa unidades o compara con una estimación."
        >
          {(id, ayuda) => (
            <textarea
              id={id}
              aria-describedby={ayuda}
              className="campo min-h-16"
              value={e.comprobacion}
              onChange={(ev) => set('comprobacion', ev.target.value)}
            />
          )}
        </Campo>

        <div className="rounded-xl border border-linea/70 p-3">
          <Interruptor
            activo={!!diagrama}
            onCambio={(v) => {
              if (v) set('diagrama', DIAGRAMA_INICIAL);
              else setE(({ diagrama: _d, ...resto }) => resto);
            }}
            etiqueta="Diagrama de cuerpo libre"
            descripcion="Dibuja las fuerzas con su magnitud y ángulo. Ideal para estática y dinámica."
          />
          {diagrama && (
            <div className="mt-4 flex flex-col gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Campo etiqueta="Cuerpo">
                  {(id) => (
                    <select
                      id={id}
                      className="campo"
                      value={diagrama.cuerpo}
                      onChange={(ev) =>
                        setDiagrama({ cuerpo: ev.target.value as Diagrama['cuerpo'] })
                      }
                    >
                      <option value="particula">Partícula o nudo</option>
                      <option value="bloque">Bloque sobre un plano</option>
                    </select>
                  )}
                </Campo>
                {diagrama.cuerpo === 'bloque' && (
                  <Campo etiqueta="Inclinación del plano (°)">
                    {(id) => (
                      <NumeroEntrada
                        id={id}
                        valor={diagrama.inclinacion}
                        min={0}
                        max={89}
                        onCambio={(v) =>
                          v !== null && v >= 0 && v <= 89 && setDiagrama({ inclinacion: v })
                        }
                      />
                    )}
                  </Campo>
                )}
              </div>
              <p className="text-xs text-tinta-suave">
                Ángulo desde el eje x positivo: 0 a la derecha, 90 arriba, 180 a la izquierda, 270
                abajo.
              </p>
              {diagrama.fuerzas.map((f, i) => (
                <div
                  key={i}
                  className="grid grid-cols-2 gap-2 rounded-xl bg-superficie-2/60 p-2 sm:grid-cols-[5rem_1fr_6rem_5rem_4rem_auto]"
                >
                  <input
                    aria-label={`Fuerza ${i + 1}: nombre`}
                    className="campo"
                    placeholder="Nombre"
                    value={f.nombre}
                    onChange={(ev) => setFuerza(i, { nombre: ev.target.value })}
                  />
                  <select
                    aria-label={`Fuerza ${i + 1}: tipo`}
                    className="campo"
                    value={f.tipo}
                    onChange={(ev) => setFuerza(i, { tipo: ev.target.value as TipoFuerza })}
                  >
                    {TIPOS_FUERZA.map((t) => (
                      <option key={t} value={t}>
                        {NOMBRE_TIPO_FUERZA[t]}
                      </option>
                    ))}
                  </select>
                  <NumeroEntrada
                    aria-label={`Fuerza ${i + 1}: magnitud`}
                    valor={f.magnitud}
                    min={0}
                    onCambio={(v) => v !== null && v >= 0 && setFuerza(i, { magnitud: v })}
                  />
                  <NumeroEntrada
                    aria-label={`Fuerza ${i + 1}: ángulo en grados`}
                    valor={f.angulo}
                    onCambio={(v) => v !== null && setFuerza(i, { angulo: v })}
                  />
                  <input
                    aria-label={`Fuerza ${i + 1}: unidad`}
                    className="campo"
                    value={f.unidad}
                    onChange={(ev) => setFuerza(i, { unidad: ev.target.value })}
                  />
                  <button
                    type="button"
                    className="boton-fantasma p-2"
                    aria-label={`Quitar la fuerza ${i + 1}`}
                    disabled={diagrama.fuerzas.length === 1}
                    onClick={() =>
                      setDiagrama({ fuerzas: diagrama.fuerzas.filter((_, j) => j !== i) })
                    }
                  >
                    <Icono nombre="papelera" tamano={16} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="boton-secundario self-start"
                onClick={() =>
                  setDiagrama({
                    fuerzas: [
                      ...diagrama.fuerzas,
                      {
                        nombre: `F${diagrama.fuerzas.length + 1}`,
                        tipo: 'aplicada',
                        magnitud: 50,
                        angulo: 0,
                        unidad: 'N',
                      },
                    ],
                  })
                }
              >
                Agregar fuerza
              </button>
              {R && (
                <p className="text-xs text-tinta-suave" aria-live="polite">
                  Suma de fuerzas: ΣFx = {num(R.x)}, ΣFy = {num(R.y)}
                  {R.magnitud < 1e-6 * Math.max(1, ...diagrama.fuerzas.map((f) => f.magnitud))
                    ? ' · está en equilibrio'
                    : ` · resultante de ${num(R.magnitud)} a ${num(R.angulo, 1)}°`}
                </p>
              )}
              <DiagramaCuerpoLibre diagrama={diagrama} />
            </div>
          )}
        </div>

        <Avisos avisos={avisos} />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="boton-fantasma"
            onClick={() => navegar(inicial ? `/ejemplos/${inicial.id}` : '/ejemplos')}
          >
            Cancelar
          </button>
          <button type="submit" className="boton-primario">
            Guardar ejemplo
          </button>
        </div>
      </form>
    </Tarjeta>
  );
}
