import { useMemo, useState } from 'react';
import type { ErrorRegistrado, PerfilAcademico } from '@/db/esquemas';
import { crearConcepto, crearTarjeta, registrarError } from '@/db/operaciones';
import { ahoraIso, guardar, nuevoId } from '@/db/repositorio';
import {
  esNivelAnterior,
  NIVELES,
  NOMBRE_NIVEL,
  NOMBRE_TIPO_ERROR,
  TIPOS_ERROR,
  type Nivel,
  type TipoError,
} from '@/dominio/catalogo';
import { ChipOpcion } from '@/componentes/Chip';
import { Campo } from '@/componentes/Formulario';
import { Icono } from '@/componentes/Icono';
import { Tarjeta } from '@/componentes/Tarjeta';
import type { DatosErrores } from './datos';

function Paso({ n, titulo, children }: { n: number; titulo: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-tinta-suave">
        <span className="grid h-5 w-5 place-items-center rounded-full bg-superficie-2 text-[11px] text-tinta">
          {n}
        </span>
        {titulo}
      </p>
      {children}
    </div>
  );
}

export function RegistroRapido({
  perfil,
  datos,
}: {
  perfil: PerfilAcademico;
  datos: DatosErrores;
}) {
  const materias = datos.materias
    .filter((m) => m.perfilId === perfil.id)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  const [materiaId, setMateriaId] = useState(materias[0]?.id ?? '');
  const [temaId, setTemaId] = useState('');
  const [tipo, setTipo] = useState<TipoError | null>(null);
  const [conceptoIds, setConceptoIds] = useState<string[]>([]);
  const [detalles, setDetalles] = useState(false);
  const [conTarjeta, setConTarjeta] = useState(true);
  const [texto, setTexto] = useState({ enunciado: '', miRespuesta: '', solucionCorrecta: '' });
  const [nuevoTema, setNuevoTema] = useState('');
  const [nuevaRaiz, setNuevaRaiz] = useState('');
  const [nivelRaiz, setNivelRaiz] = useState<Nivel>(perfil.nivel);
  const [aviso, setAviso] = useState<{ texto: string; bases: string[] } | null>(null);

  const temas = datos.temas
    .filter((t) => t.materiaId === materiaId)
    .sort((a, b) => a.titulo.localeCompare(b.titulo, 'es'));
  const sugeridos = useMemo(() => {
    const delTema = datos.conceptos.filter((c) => temaId && c.temaIds.includes(temaId));
    const resto = datos.conceptos.filter((c) => !delTema.includes(c));
    return [...delTema, ...resto];
  }, [datos.conceptos, temaId]);

  const listo = materiaId && temaId && tipo;

  async function agregarTema(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevoTema.trim() || !materiaId) return;
    const t = await guardar('temas', {
      id: nuevoId(),
      materiaId,
      titulo: nuevoTema.trim(),
      pesoParcial: 0,
      dominio: 0,
    });
    setTemaId(t.id);
    setNuevoTema('');
  }

  async function agregarRaiz(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevaRaiz.trim()) return;
    const c = await crearConcepto({ nombre: nuevaRaiz, nivelOrigen: nivelRaiz });
    setConceptoIds((ids) => (ids.includes(c.id) ? ids : [...ids, c.id]));
    setNuevaRaiz('');
  }

  async function guardarError() {
    if (!listo || !tipo) return;
    const error: ErrorRegistrado = {
      id: nuevoId(),
      materiaId,
      temaId,
      tipo,
      ...texto,
      conceptoIds,
      fecha: ahoraIso(),
      resuelto: false,
    };
    await registrarError(error);
    const hayTarjeta =
      conTarjeta && texto.enunciado.trim() !== '' && texto.solucionCorrecta.trim() !== '';
    if (hayTarjeta) {
      await crearTarjeta({
        origenTipo: 'error',
        origenId: error.id,
        temaId,
        frente: texto.enunciado.trim(),
        reverso: texto.solucionCorrecta.trim(),
      });
    }
    const bases = datos.conceptos.filter(
      (c) => conceptoIds.includes(c.id) && esNivelAnterior(c.nivelOrigen, perfil.nivel),
    );
    setAviso({
      texto: hayTarjeta ? 'Error registrado y tarjeta de repaso creada.' : 'Error registrado.',
      bases: bases.map((b) => `${b.nombre} (${NOMBRE_NIVEL[b.nivelOrigen]})`),
    });
    setTipo(null);
    setConceptoIds([]);
    setTexto({ enunciado: '', miRespuesta: '', solucionCorrecta: '' });
    setDetalles(false);
  }

  if (materias.length === 0) {
    return (
      <Tarjeta titulo="Registrar un error" icono="errores">
        <p className="text-sm text-tinta-suave">Primero crea una materia con sus temas.</p>
        <a href="#/materias" className="boton-primario mt-4">
          Ir a materias
        </a>
      </Tarjeta>
    );
  }

  return (
    <Tarjeta titulo="Registrar un error" icono="errores">
      <div className="flex flex-col gap-5">
        <Paso n={1} titulo="Materia">
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap">
            {materias.map((m) => (
              <ChipOpcion
                key={m.id}
                activo={m.id === materiaId}
                color={m.color}
                onClick={() => {
                  setMateriaId(m.id);
                  setTemaId('');
                }}
              >
                {m.nombre}
              </ChipOpcion>
            ))}
          </div>
        </Paso>

        <Paso n={2} titulo="Tema">
          <div className="flex flex-wrap gap-2">
            {temas.map((t) => (
              <ChipOpcion key={t.id} activo={t.id === temaId} onClick={() => setTemaId(t.id)}>
                {t.titulo}
              </ChipOpcion>
            ))}
            <form onSubmit={agregarTema} className="flex gap-1">
              <input
                className="campo h-10 w-40 rounded-full py-1.5"
                placeholder="Otro tema"
                aria-label="Nuevo tema"
                value={nuevoTema}
                onChange={(e) => setNuevoTema(e.target.value)}
              />
              {nuevoTema.trim() && (
                <button
                  type="submit"
                  className="boton-secundario rounded-full px-3"
                  aria-label="Agregar tema"
                >
                  <Icono nombre="mas" tamano={16} />
                </button>
              )}
            </form>
          </div>
        </Paso>

        <Paso n={3} titulo="Tipo de error">
          <div className="flex flex-wrap gap-2">
            {TIPOS_ERROR.map((t) => (
              <ChipOpcion key={t} activo={t === tipo} onClick={() => setTipo(t)}>
                {NOMBRE_TIPO_ERROR[t]}
              </ChipOpcion>
            ))}
          </div>
        </Paso>

        <Paso n={4} titulo="¿De qué base viene? (opcional)">
          <p className="-mt-1 text-xs text-tinta-suave">
            Elige el concepto de fondo que falló, aunque sea de otra materia o de un nivel anterior.
          </p>
          <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto">
            {sugeridos.map((c) => {
              const activo = conceptoIds.includes(c.id);
              return (
                <ChipOpcion
                  key={c.id}
                  activo={activo}
                  onClick={() =>
                    setConceptoIds(
                      activo ? conceptoIds.filter((x) => x !== c.id) : [...conceptoIds, c.id],
                    )
                  }
                >
                  {c.nombre}
                  {esNivelAnterior(c.nivelOrigen, perfil.nivel) && (
                    <span
                      className={`text-[10px] font-bold uppercase ${activo ? 'opacity-80' : 'text-tinta-suave'}`}
                    >
                      {NOMBRE_NIVEL[c.nivelOrigen]}
                    </span>
                  )}
                </ChipOpcion>
              );
            })}
          </div>
          <form onSubmit={agregarRaiz} className="flex flex-wrap gap-2">
            <input
              className="campo min-w-0 flex-[2]"
              placeholder="Nueva raíz, por ejemplo Despejes"
              aria-label="Nombre de la nueva raíz"
              value={nuevaRaiz}
              onChange={(e) => setNuevaRaiz(e.target.value)}
            />
            <select
              className="campo w-auto flex-1"
              aria-label="Nivel de origen de la raíz"
              value={nivelRaiz}
              onChange={(e) => setNivelRaiz(e.target.value as Nivel)}
            >
              {NIVELES.map((n) => (
                <option key={n} value={n}>
                  {NOMBRE_NIVEL[n]}
                </option>
              ))}
            </select>
            <button type="submit" className="boton-secundario" disabled={!nuevaRaiz.trim()}>
              Crear raíz
            </button>
          </form>
        </Paso>

        <div>
          <button
            type="button"
            className="boton-fantasma px-0"
            aria-expanded={detalles}
            onClick={() => setDetalles(!detalles)}
          >
            <Icono
              nombre="flecha"
              tamano={16}
              className={`transition-transform ${detalles ? 'rotate-90' : ''}`}
            />
            Detalles del ejercicio (opcional)
          </button>
          {detalles && (
            <div className="mt-3 grid gap-3">
              <Campo etiqueta="Enunciado">
                {(id) => (
                  <textarea
                    id={id}
                    className="campo min-h-20"
                    value={texto.enunciado}
                    onChange={(e) => setTexto({ ...texto, enunciado: e.target.value })}
                  />
                )}
              </Campo>
              <div className="grid gap-3 sm:grid-cols-2">
                <Campo etiqueta="Mi respuesta">
                  {(id) => (
                    <textarea
                      id={id}
                      className="campo min-h-20"
                      value={texto.miRespuesta}
                      onChange={(e) => setTexto({ ...texto, miRespuesta: e.target.value })}
                    />
                  )}
                </Campo>
                <Campo etiqueta="Solución correcta">
                  {(id) => (
                    <textarea
                      id={id}
                      className="campo min-h-20"
                      value={texto.solucionCorrecta}
                      onChange={(e) => setTexto({ ...texto, solucionCorrecta: e.target.value })}
                    />
                  )}
                </Campo>
              </div>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[rgb(var(--primario))]"
                  checked={conTarjeta}
                  onChange={(e) => setConTarjeta(e.target.checked)}
                />
                Crear tarjeta de repaso con el enunciado y la solución
              </label>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <div className="mr-auto text-sm" role="status">
            {aviso && (
              <>
                <p className="font-semibold text-exito">{aviso.texto}</p>
                {aviso.bases.length > 0 && (
                  <p className="text-oxido">
                    Base pendiente de un nivel anterior: {aviso.bases.join(', ')}. Mira la
                    sugerencia de repaso en el panel de raíces.
                  </p>
                )}
              </>
            )}
          </div>
          <button type="button" className="boton-primario" disabled={!listo} onClick={guardarError}>
            Guardar error
          </button>
        </div>
      </div>
    </Tarjeta>
  );
}
