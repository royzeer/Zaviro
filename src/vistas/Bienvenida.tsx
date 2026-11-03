import { useState } from 'react';
import { navegar } from '@/app/enrutador';
import { cargarDatosEjemplo } from '@/db/datosEjemplo';
import type { Reglas } from '@/db/esquemas';
import { crearPerfil } from '@/db/operaciones';
import {
  AREAS,
  NIVELES,
  NOMBRE_AREA,
  NOMBRE_MODULO,
  NOMBRE_NIVEL,
  type Area,
  type Modulo,
  type Nivel,
} from '@/dominio/catalogo';
import {
  modulosDisponibles,
  modulosSugeridos,
  reglasSugeridas,
  revisarReglas,
} from '@/dominio/niveles';
import { EditorReglas } from '@/componentes/EditorReglas';
import { Campo, NumeroEntrada } from '@/componentes/Formulario';
import { Icono } from '@/componentes/Icono';
import { Respaldo } from './ajustes/Respaldo';

const DESCRIPCION_NIVEL: Record<Nivel, string> = {
  bachillerato: 'Básica secundaria y media. Incluye preparación Saber 11.',
  tecnico: 'Programas técnicos profesionales, por evidencias o notas.',
  tecnologo: 'Tecnologías, incluidas las del SENA, por evidencias.',
  profesional: 'Pregrado universitario con cortes y créditos.',
  especializacion: 'Posgrado con trabajo de grado y lecturas.',
  maestria: 'Posgrado con trabajo de grado, lecturas y citas.',
  doctorado: 'Hitos de investigación, lecturas y bitácora.',
};

const PASOS = ['Nivel', 'Área', 'Reglas', 'Módulos'];

export function Bienvenida({ primeraVez }: { primeraVez: boolean }) {
  const [paso, setPaso] = useState(0);
  const [nivel, setNivel] = useState<Nivel | null>(null);
  const [area, setArea] = useState<Area | null>(null);
  const [institucion, setInstitucion] = useState('');
  const [programa, setPrograma] = useState('');
  const [creditosPrograma, setCreditosPrograma] = useState<number | null>(null);
  const [reglas, setReglas] = useState<Reglas | null>(null);
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [guardando, setGuardando] = useState(false);

  function elegirNivel(n: Nivel) {
    setNivel(n);
    setReglas(reglasSugeridas(n));
    setModulos(modulosSugeridos(n));
    setPaso(1);
  }

  const puedeSeguir =
    paso === 0
      ? nivel !== null
      : paso === 1
        ? area !== null
        : paso === 2
          ? reglas !== null && revisarReglas(reglas).length === 0
          : true;

  async function crear() {
    if (!nivel || !area || !reglas) return;
    setGuardando(true);
    await crearPerfil({
      nivel,
      area,
      institucion: institucion.trim(),
      ...(programa.trim() ? { programa: programa.trim() } : {}),
      ...(creditosPrograma ? { creditosPrograma: Math.round(creditosPrograma) } : {}),
      reglas,
      modulosActivos: modulos,
    });
    navegar('/');
  }

  async function probarEjemplo() {
    setGuardando(true);
    await cargarDatosEjemplo();
    navegar('/');
  }

  return (
    <div className="min-h-dvh bg-fondo">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 pb-16 pt-8 sm:px-6 sm:pt-14">
        <header className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-primario text-sobre-primario">
              <Icono nombre="raiz" tamano={24} />
            </span>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                {primeraVez ? 'Bienvenido a Zaviro' : 'Nuevo perfil académico'}
              </h1>
              <p className="text-sm text-tinta-suave">
                {primeraVez
                  ? 'Cuéntanos qué estudias para adaptar las notas, los módulos y el vocabulario.'
                  : 'Puedes tener varios perfiles a la vez y cambiar entre ellos sin perder datos.'}
              </p>
            </div>
          </div>
          {!primeraVez && (
            <a href="#/perfil" className="boton-fantasma">
              Cancelar
            </a>
          )}
        </header>

        <ol className="grid grid-cols-4 gap-2" aria-label="Pasos">
          {PASOS.map((p, i) => (
            <li
              key={p}
              aria-current={i === paso ? 'step' : undefined}
              className="flex flex-col gap-1.5"
            >
              <span className={`h-1.5 rounded-full ${i <= paso ? 'bg-primario' : 'bg-linea'}`} />
              <span
                className={`text-xs font-semibold ${i === paso ? 'text-tinta' : 'text-tinta-suave'}`}
              >
                {p}
              </span>
            </li>
          ))}
        </ol>

        <section className="tarjeta animate-aparecer" key={paso}>
          {paso === 0 && (
            <>
              <h2 className="titulo-tarjeta mb-1">¿En qué nivel estudias?</h2>
              <p className="mb-4 text-sm text-tinta-suave">
                Si estudias dos cosas a la vez, crea un perfil para cada una.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {NIVELES.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => elegirNivel(n)}
                    aria-pressed={nivel === n}
                    className={`rounded-2xl border p-4 text-left transition-colors ${nivel === n ? 'border-primario bg-superficie-2' : 'border-linea hover:bg-superficie-2/70'}`}
                  >
                    <span className="block font-bold">{NOMBRE_NIVEL[n]}</span>
                    <span className="block text-xs text-tinta-suave">{DESCRIPCION_NIVEL[n]}</span>
                  </button>
                ))}
              </div>
              {primeraVez && (
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-superficie-2/70 p-4">
                  <p className="text-sm text-tinta-suave">
                    ¿Solo quieres mirar? Carga datos de ejemplo y bórralos después desde Ajustes.
                  </p>
                  <button
                    type="button"
                    className="boton-secundario"
                    onClick={probarEjemplo}
                    disabled={guardando}
                  >
                    Probar con datos de ejemplo
                  </button>
                </div>
              )}
              {primeraVez && (
                <div className="mt-3 rounded-2xl bg-superficie-2/70 p-4">
                  <p className="mb-3 text-sm text-tinta-suave">
                    ¿Ya usabas Zaviro en otro equipo? Restaura tu respaldo en JSON.
                  </p>
                  <Respaldo soloImportar />
                </div>
              )}
            </>
          )}

          {paso === 1 && nivel && (
            <>
              <h2 className="titulo-tarjeta mb-1">Área y lugar de estudio</h2>
              <p className="mb-4 text-sm text-tinta-suave">
                El área ajusta las plantillas de estudio y los ejemplos resueltos.
              </p>
              <div className="mb-5 grid gap-2 sm:grid-cols-2">
                {AREAS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setArea(a)}
                    aria-pressed={area === a}
                    className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-colors ${area === a ? 'border-primario bg-superficie-2' : 'border-linea hover:bg-superficie-2/70'}`}
                  >
                    {NOMBRE_AREA[a]}
                  </button>
                ))}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Campo etiqueta="Institución">
                  {(id) => (
                    <input
                      id={id}
                      className="campo"
                      value={institucion}
                      onChange={(e) => setInstitucion(e.target.value)}
                      placeholder={
                        nivel === 'bachillerato' ? 'Nombre del colegio' : 'Nombre de la institución'
                      }
                    />
                  )}
                </Campo>
                {nivel !== 'bachillerato' && (
                  <Campo etiqueta="Programa (opcional)">
                    {(id) => (
                      <input
                        id={id}
                        className="campo"
                        value={programa}
                        onChange={(e) => setPrograma(e.target.value)}
                        placeholder="Por ejemplo, Ingeniería civil"
                      />
                    )}
                  </Campo>
                )}
                {nivel === 'profesional' && (
                  <Campo
                    etiqueta="Créditos del programa (opcional)"
                    ayuda="Está en el plan de estudios. Sirve para ver cuánto te falta para graduarte."
                  >
                    {(id, idAyuda) => (
                      <NumeroEntrada
                        id={id}
                        aria-describedby={idAyuda}
                        vacioPermitido
                        valor={creditosPrograma}
                        onCambio={setCreditosPrograma}
                        placeholder="Por ejemplo, 160"
                      />
                    )}
                  </Campo>
                )}
              </div>
            </>
          )}

          {paso === 2 && nivel && reglas && (
            <>
              <h2 className="titulo-tarjeta mb-1">Reglas de tu institución</h2>
              <p className="mb-4 text-sm text-tinta-suave">
                Estos valores son sugerencias para {NOMBRE_NIVEL[nivel].toLowerCase()}. Cámbialos si
                tu reglamento dice otra cosa; puedes volver a editarlos cuando quieras.
              </p>
              <EditorReglas nivel={nivel} reglas={reglas} onCambio={setReglas} />
            </>
          )}

          {paso === 3 && nivel && (
            <>
              <h2 className="titulo-tarjeta mb-1">Módulos</h2>
              <p className="mb-4 text-sm text-tinta-suave">
                Activa lo que te sirve. Puedes cambiarlo después en tu perfil.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {modulosDisponibles(nivel).map((m) => {
                  const activo = modulos.includes(m);
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
                          setModulos(activo ? modulos.filter((x) => x !== m) : [...modulos, m])
                        }
                      />
                      {NOMBRE_MODULO[m]}
                    </label>
                  );
                })}
              </div>
            </>
          )}
        </section>

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            className="boton-fantasma"
            onClick={() => setPaso(paso - 1)}
            disabled={paso === 0}
          >
            Atrás
          </button>
          {paso < PASOS.length - 1 ? (
            <button
              type="button"
              className="boton-primario"
              onClick={() => setPaso(paso + 1)}
              disabled={!puedeSeguir}
            >
              Continuar <Icono nombre="flecha" tamano={16} />
            </button>
          ) : (
            <button type="button" className="boton-primario" onClick={crear} disabled={guardando}>
              Crear perfil
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
