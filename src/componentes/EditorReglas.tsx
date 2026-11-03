import type { Reglas } from '@/db/esquemas';
import type { Nivel } from '@/dominio/catalogo';
import { revisarReglas, sumaPesos, vocabulario } from '@/dominio/niveles';
import { Avisos, Campo, Interruptor, NumeroEntrada } from './Formulario';
import { Icono } from './Icono';

function Seccion({
  titulo,
  ayuda,
  children,
}: {
  titulo: string;
  ayuda?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="rounded-2xl border border-linea/70 bg-superficie-2/40 p-4">
      <legend className="px-1 text-sm font-bold">{titulo}</legend>
      {ayuda && <p className="mb-4 text-xs leading-snug text-tinta-suave">{ayuda}</p>}
      <div className="flex flex-col gap-4">{children}</div>
    </fieldset>
  );
}

/**
 * Editor de las reglas académicas de un perfil. Todo valor que cambia entre
 * instituciones se edita aquí y viene con una explicación en pantalla.
 */
export function EditorReglas({
  nivel,
  reglas,
  onCambio,
}: {
  nivel: Nivel;
  reglas: Reglas;
  onCambio: (r: Reglas) => void;
}) {
  const vocab = vocabulario(nivel);
  const cambiar = (parcial: (r: Reglas) => void) => {
    const copia = structuredClone(reglas);
    parcial(copia);
    onCambio(copia);
  };
  const { escala } = reglas;
  const suma = sumaPesos(reglas.evaluacion.componentes);
  const esHitos = reglas.evaluacion.tipo === 'hitos';

  return (
    <div className="flex flex-col gap-4">
      <Avisos avisos={revisarReglas(reglas)} />

      <Seccion
        titulo="Escala de notas"
        ayuda="Los valores sugeridos son los más comunes para tu nivel, pero tu institución puede usar otros. Cámbialos si tu reglamento dice algo distinto."
      >
        <Interruptor
          etiqueta="Usar notas numéricas"
          descripcion={
            nivel === 'doctorado'
              ? 'En doctorado vienen apagadas; actívalas si tus seminarios se califican.'
              : 'Apágalas si tu programa no califica con números.'
          }
          activo={reglas.usaNotas}
          onCambio={(v) => cambiar((r) => void (r.usaNotas = v))}
        />
        {reglas.usaNotas && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Campo etiqueta="Mínima">
              {(id) => (
                <NumeroEntrada
                  id={id}
                  valor={escala.minimo}
                  onCambio={(v) => v !== null && cambiar((r) => void (r.escala.minimo = v))}
                />
              )}
            </Campo>
            <Campo etiqueta="Máxima">
              {(id) => (
                <NumeroEntrada
                  id={id}
                  valor={escala.maximo}
                  onCambio={(v) => v !== null && cambiar((r) => void (r.escala.maximo = v))}
                />
              )}
            </Campo>
            <Campo etiqueta="Aprobatoria">
              {(id) => (
                <NumeroEntrada
                  id={id}
                  valor={escala.aprobatoria}
                  onCambio={(v) => v !== null && cambiar((r) => void (r.escala.aprobatoria = v))}
                />
              )}
            </Campo>
            <Campo etiqueta="Decimales">
              {(id) => (
                <NumeroEntrada
                  id={id}
                  valor={escala.decimales}
                  min={0}
                  max={3}
                  onCambio={(v) =>
                    v !== null &&
                    Number.isInteger(v) &&
                    v >= 0 &&
                    v <= 3 &&
                    cambiar((r) => void (r.escala.decimales = v))
                  }
                />
              )}
            </Campo>
          </div>
        )}
      </Seccion>

      {reglas.usaNotas && (reglas.categoriasDesempeno.length > 0 || nivel === 'bachillerato') && (
        <Seccion titulo="Escala nacional de desempeño" ayuda={vocab.ayudaPromedio}>
          {reglas.categoriasDesempeno.map((c, i) => (
            <div key={i} className="grid grid-cols-[1fr_5.5rem_5.5rem] items-end gap-2">
              <p className="pb-2.5 text-sm font-semibold">{c.nombre}</p>
              <Campo etiqueta="Desde">
                {(id) => (
                  <NumeroEntrada
                    id={id}
                    vacioPermitido
                    placeholder="—"
                    valor={c.desde}
                    onCambio={(v) => cambiar((r) => void (r.categoriasDesempeno[i]!.desde = v))}
                  />
                )}
              </Campo>
              <Campo etiqueta="Hasta">
                {(id) => (
                  <NumeroEntrada
                    id={id}
                    vacioPermitido
                    placeholder="—"
                    valor={c.hasta}
                    onCambio={(v) => cambiar((r) => void (r.categoriasDesempeno[i]!.hasta = v))}
                  />
                )}
              </Campo>
            </div>
          ))}
          {reglas.categoriasDesempeno.every((c) => c.desde === null) && (
            <p className="text-xs text-tinta-suave">
              Puedes dejarlos vacíos por ahora y completarlos cuando tengas el boletín.
            </p>
          )}
        </Seccion>
      )}

      <Seccion
        titulo={esHitos ? 'Hitos' : `${vocab.componentes} y sus pesos`}
        ayuda={vocab.ayudaEvaluacion}
      >
        <ul className="flex flex-col gap-2">
          {reglas.evaluacion.componentes.map((c, i) => (
            <li key={i} className="flex items-center gap-2">
              <input
                className="campo flex-1"
                aria-label={`Nombre de ${vocab.componente.toLowerCase()} ${i + 1}`}
                value={c.nombre}
                onChange={(e) =>
                  cambiar((r) => void (r.evaluacion.componentes[i]!.nombre = e.target.value))
                }
              />
              {!esHitos && reglas.usaNotas && (
                <div className="relative w-24">
                  <NumeroEntrada
                    aria-label={`Peso de ${c.nombre} en porcentaje`}
                    valor={c.peso}
                    min={0}
                    max={100}
                    onCambio={(v) =>
                      v !== null && cambiar((r) => void (r.evaluacion.componentes[i]!.peso = v))
                    }
                    className="pr-7"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-tinta-suave">
                    %
                  </span>
                </div>
              )}
              <button
                type="button"
                className="boton-fantasma p-2"
                aria-label={`Quitar ${c.nombre}`}
                onClick={() => cambiar((r) => void r.evaluacion.componentes.splice(i, 1))}
              >
                <Icono nombre="papelera" tamano={16} />
              </button>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            className="boton-secundario"
            onClick={() =>
              cambiar(
                (r) =>
                  void r.evaluacion.componentes.push({
                    nombre: `${vocab.componente} ${r.evaluacion.componentes.length + 1}`,
                    peso: 0,
                  }),
              )
            }
          >
            <Icono nombre="mas" tamano={16} /> Agregar {vocab.componente.toLowerCase()}
          </button>
          {!esHitos && reglas.usaNotas && (
            <p
              className={`text-sm font-semibold tabular-nums ${suma === 100 ? 'text-exito' : 'text-peligro'}`}
            >
              Suma: {String(suma).replace('.', ',')}%
            </p>
          )}
        </div>
      </Seccion>

      <Seccion
        titulo="Créditos académicos"
        ayuda="Un crédito equivale a 48 horas de trabajo del estudiante en el período académico, sumando horas con docente y trabajo independiente. La proporción entre ambas cambia según el programa."
      >
        <Interruptor
          etiqueta="Usar créditos"
          activo={reglas.creditos.activados}
          onCambio={(v) => cambiar((r) => void (r.creditos.activados = v))}
        />
        {reglas.creditos.activados && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo etiqueta="Horas por crédito">
              {(id) => (
                <NumeroEntrada
                  id={id}
                  valor={reglas.creditos.horasPorCredito}
                  min={1}
                  onCambio={(v) =>
                    v !== null && v > 0 && cambiar((r) => void (r.creditos.horasPorCredito = v))
                  }
                />
              )}
            </Campo>
            <Campo
              etiqueta="Horas con docente (%)"
              ayuda={`Por cada crédito: ${fmt(reglas.creditos.horasPorCredito * reglas.creditos.proporcionDocente)} h con docente y ${fmt(reglas.creditos.horasPorCredito * (1 - reglas.creditos.proporcionDocente))} h de trabajo independiente.`}
            >
              {(id, idAyuda) => (
                <NumeroEntrada
                  id={id}
                  aria-describedby={idAyuda}
                  min={0}
                  max={100}
                  valor={Math.round(reglas.creditos.proporcionDocente * 1000) / 10}
                  onCambio={(v) =>
                    v !== null &&
                    v >= 0 &&
                    v <= 100 &&
                    cambiar((r) => void (r.creditos.proporcionDocente = v / 100))
                  }
                />
              )}
            </Campo>
          </div>
        )}
      </Seccion>

      {reglas.usaNotas && (
        <Seccion
          titulo="Nota mínima y promedio"
          ayuda={nivel === 'bachillerato' ? undefined : vocab.ayudaPromedio}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo etiqueta={`Nota mínima por ${vocab.materia.toLowerCase()}`}>
              {(id) => (
                <NumeroEntrada
                  id={id}
                  valor={reglas.promedio.notaMinimaMateria}
                  onCambio={(v) =>
                    v !== null && cambiar((r) => void (r.promedio.notaMinimaMateria = v))
                  }
                />
              )}
            </Campo>
            <Campo
              etiqueta="Promedio acumulado mínimo"
              ayuda="Déjalo vacío si tu programa no exige uno."
            >
              {(id, idAyuda) => (
                <NumeroEntrada
                  id={id}
                  aria-describedby={idAyuda}
                  vacioPermitido
                  placeholder="No aplica"
                  valor={reglas.promedio.promedioAcumuladoMinimo}
                  onCambio={(v) => cambiar((r) => void (r.promedio.promedioAcumuladoMinimo = v))}
                />
              )}
            </Campo>
          </div>
          <Interruptor
            etiqueta="Promedio ponderado por créditos"
            descripcion="Cada nota pesa según los créditos de la materia. Si está apagado, todas las materias pesan igual."
            activo={reglas.promedio.ponderadoPorCreditos}
            onCambio={(v) => cambiar((r) => void (r.promedio.ponderadoPorCreditos = v))}
          />
        </Seccion>
      )}

      <Seccion
        titulo="Repaso espaciado"
        ayuda="Días que esperan las primeras repeticiones de una tarjeta nueva. En bachillerato, cerca del Saber 11, conviene que sean cortos; en posgrado pueden ser más largos."
      >
        <div className="flex flex-wrap items-end gap-2">
          {reglas.repaso.intervalosIniciales.map((d, i) => (
            <Campo key={i} etiqueta={`Repaso ${i + 1} (días)`} className="w-32">
              {(id) => (
                <NumeroEntrada
                  id={id}
                  valor={d}
                  min={0.1}
                  onCambio={(v) =>
                    v !== null &&
                    v > 0 &&
                    cambiar((r) => void (r.repaso.intervalosIniciales[i] = v))
                  }
                />
              )}
            </Campo>
          ))}
          {reglas.repaso.intervalosIniciales.length < 4 && (
            <button
              type="button"
              className="boton-fantasma"
              onClick={() =>
                cambiar(
                  (r) =>
                    void r.repaso.intervalosIniciales.push(
                      (r.repaso.intervalosIniciales.at(-1) ?? 1) * 2,
                    ),
                )
              }
            >
              <Icono nombre="mas" tamano={16} /> Otro
            </button>
          )}
          {reglas.repaso.intervalosIniciales.length > 1 && (
            <button
              type="button"
              className="boton-fantasma"
              onClick={() => cambiar((r) => void r.repaso.intervalosIniciales.pop())}
            >
              Quitar el último
            </button>
          )}
        </div>
      </Seccion>
    </div>
  );
}

function fmt(n: number) {
  return String(Math.round(n * 10) / 10).replace('.', ',');
}
