import { useEffect, useRef, useState, type DragEvent } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { hrefDe, navegar } from '@/app/enrutador';
import type { Materia, PerfilAcademico } from '@/db/esquemas';
import { importarDocumento, type ResultadoImportacion } from '@/db/importarDocumento';
import { materiasDePerfil } from '@/db/operaciones';
import { useConsulta } from '@/db/useConsulta';
import { useSubida } from '@/estado/subida';
import { usePerfil } from '@/estado/usePerfil';
import {
  estructurarDocumento,
  fechasDeExamen,
  normalizarPalabra,
  pesosDeSecciones,
  tarjetasDeSeccion,
  type DocumentoLeido,
  type FechaExamen,
} from '@/dominio/documentos';
import { iaDisponible, organizarConIa } from '@/documentos/ia';
import { ErrorDocumento, leerArchivo, TIPOS_ACEPTADOS } from '@/documentos/leer';
import { ErrorApi } from '@/sincronizacion/cliente';
import { Dialogo } from '@/componentes/Dialogo';
import { Icono } from '@/componentes/Icono';
import { fechaInputAIso } from '@/utilidades/fechas';

interface Lectura {
  archivo: string;
  documento: DocumentoLeido;
  fechas: FechaExamen[];
  /** Fecha de examen que encontró la IA (AAAA-MM-DD). */
  fechaIa?: string | null;
  /** Por qué no se usó la IA, si se intentó. */
  avisoIa?: string;
}

const DIFICULTAD = { baja: 'Fácil', media: 'Media', alta: 'Difícil' } as const;

function materiaSugerida(doc: DocumentoLeido, archivo: string, materias: Materia[]) {
  const textos = normalizarPalabra(`${doc.titulo} ${archivo}`);
  return materias.find((m) => textos.includes(normalizarPalabra(m.nombre)))?.id ?? '';
}

function Revision({
  lectura,
  perfil,
  materias,
  alTerminar,
}: {
  lectura: Lectura;
  perfil: PerfilAcademico;
  materias: Materia[];
  alTerminar: (r: ResultadoImportacion) => void;
}) {
  const { documento, fechas, fechaIa } = lectura;
  const conIa = documento.organizadoPor === 'ia';
  const [materiaId, setMateriaId] = useState(() =>
    materiaSugerida(documento, lectura.archivo, materias),
  );
  const [nombre, setNombre] = useState(documento.titulo);
  const [elegidas, setElegidas] = useState(() => documento.secciones.map((_, i) => i));
  const materia = materias.find((m) => m.id === materiaId);
  const [fecha, setFecha] = useState(() =>
    fechaIa ? fechaIa : fechas[0] ? format(fechas[0].fecha, 'yyyy-MM-dd') : '',
  );
  const [tarjetas, setTarjetas] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const pesos = pesosDeSecciones(elegidas.map((i) => documento.secciones[i]!));
  const cantidadDefiniciones = elegidas.reduce(
    (s, i) => s + tarjetasDeSeccion(documento.secciones[i]!).length,
    0,
  );

  async function importar() {
    setGuardando(true);
    const iso = fechaInputAIso(fecha);
    const r = await importarDocumento({
      perfil,
      documento,
      materiaId: materiaId || null,
      nombreMateria: nombre,
      secciones: elegidas,
      crearTarjetas: tarjetas,
      ...(iso ? { fechaExamen: iso } : {}),
    });
    alTerminar(r);
  }

  return (
    <div className="flex flex-col gap-4">
      {conIa ? (
        <div className="flex flex-col gap-1.5 text-sm text-tinta-suave">
          <span className="chip self-start">
            <Icono nombre="documento" tamano={14} /> Organizado con IA
          </span>
          <p>
            Analizamos <strong className="text-tinta">{lectura.archivo}</strong> y armamos{' '}
            {documento.secciones.length} {documento.secciones.length === 1 ? 'tema' : 'temas'} con
            su apunte de estudio, preguntas de repaso y un peso según lo importante que es cada uno.
            {documento.resumen ? ` ${documento.resumen}` : ''}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 text-sm text-tinta-suave">
          <p>
            Leímos <strong className="text-tinta">{lectura.archivo}</strong>: {documento.palabras}{' '}
            palabras en {documento.secciones.length}{' '}
            {documento.secciones.length === 1 ? 'sección' : 'secciones'}. Cada sección será un tema
            con su apunte, y entrará solo a tu plan de estudio.
          </p>
          {lectura.avisoIa && <p className="text-xs">{lectura.avisoIa}</p>}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="doc-materia" className="etiqueta">
            Materia
          </label>
          <select
            id="doc-materia"
            className="campo"
            value={materiaId}
            onChange={(e) => setMateriaId(e.target.value)}
          >
            <option value="">Crear materia nueva</option>
            {materias.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre}
              </option>
            ))}
          </select>
        </div>
        {!materiaId && (
          <div>
            <label htmlFor="doc-nombre" className="etiqueta">
              Nombre de la materia
            </label>
            <input
              id="doc-nombre"
              className="campo"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>
        )}
      </div>

      <fieldset>
        <legend className="etiqueta">Temas que se van a crear</legend>
        <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto rounded-xl border border-linea p-2">
          {documento.secciones.map((s, i) => {
            const marcada = elegidas.includes(i);
            const peso = marcada ? pesos[elegidas.indexOf(i)] : undefined;
            return (
              <li key={i}>
                <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-superficie-2">
                  <input
                    type="checkbox"
                    checked={marcada}
                    onChange={() =>
                      setElegidas((e) =>
                        marcada ? e.filter((x) => x !== i) : [...e, i].sort((a, b) => a - b),
                      )
                    }
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{s.titulo}</span>
                    <span className="text-xs text-tinta-suave">
                      {s.dificultad ? `${DIFICULTAD[s.dificultad]} · ` : ''}
                      {s.palabras} palabras
                    </span>
                  </span>
                  {peso !== undefined && <span className="chip shrink-0">{peso} %</span>}
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>

      <div>
        <label htmlFor="doc-fecha" className="etiqueta">
          Fecha del examen
        </label>
        {materia?.fechaParcial ? (
          <p className="text-sm text-tinta-suave">
            {materia.nombre} ya tiene examen el{' '}
            {format(new Date(materia.fechaParcial), "d 'de' MMMM", { locale: es })}.
          </p>
        ) : (
          <>
            <input
              id="doc-fecha"
              type="date"
              className="campo sm:w-56"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              aria-describedby="doc-fecha-ayuda"
            />
            <p id="doc-fecha-ayuda" className="mt-1.5 text-xs text-tinta-suave">
              {fechaIa
                ? 'La IA la encontró en el documento.'
                : fechas[0]
                  ? `La encontramos en el documento: "${fechas[0].contexto}".`
                  : 'No encontramos una fecha en el documento. Si la sabes, ponla para que el plan priorice esta materia.'}
            </p>
          </>
        )}
      </div>

      {cantidadDefiniciones > 0 && (
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={tarjetas}
            onChange={(e) => setTarjetas(e.target.checked)}
          />
          Crear {cantidadDefiniciones}{' '}
          {cantidadDefiniciones === 1 ? 'tarjeta de repaso' : 'tarjetas de repaso'}{' '}
          {conIa ? 'con las preguntas de la IA' : 'con las definiciones que encontramos'}
        </label>
      )}

      <button
        className="boton-primario self-start"
        onClick={() => void importar()}
        disabled={guardando || elegidas.length === 0 || (!materiaId && !nombre.trim())}
      >
        {guardando ? 'Guardando…' : 'Crear temas y apuntes'}
      </button>
    </div>
  );
}

/** Botón para subir un documento. También acepta que suelten el archivo encima. */
export function SubirDocumento({ className = 'boton-secundario' }: { className?: string }) {
  const abrirSelector = useSubida((s) => s.abrirSelector);
  const elegir = useSubida((s) => s.elegir);
  const [arrastrando, setArrastrando] = useState(false);

  function soltar(e: DragEvent) {
    e.preventDefault();
    setArrastrando(false);
    elegir(e.dataTransfer.files[0] ?? null);
  }

  return (
    <button
      type="button"
      className={`${className} ${arrastrando ? 'ring-2 ring-acento' : ''}`}
      onClick={abrirSelector}
      onDragOver={(e) => {
        e.preventDefault();
        setArrastrando(true);
      }}
      onDragLeave={() => setArrastrando(false)}
      onDrop={soltar}
    >
      <Icono nombre="documento" tamano={16} /> Subir PDF o Word
    </button>
  );
}

/** Selector de archivos y diálogo de revisión. Se monta una sola vez en la app. */
export function CentroDocumentos() {
  const { perfil } = usePerfil();
  const materias = useConsulta(
    async () => (perfil ? materiasDePerfil(perfil.id) : []),
    [perfil?.id],
  );
  const archivo = useSubida((s) => s.archivo);
  const elegir = useSubida((s) => s.elegir);
  const registrarSelector = useSubida((s) => s.registrarSelector);
  const entrada = useRef<HTMLInputElement>(null);
  const [abierto, setAbierto] = useState(false);
  const [leyendo, setLeyendo] = useState<'' | 'leyendo' | 'ia'>('');
  const [error, setError] = useState('');
  const [lectura, setLectura] = useState<Lectura | null>(null);
  const [resultado, setResultado] = useState<ResultadoImportacion | null>(null);

  useEffect(() => registrarSelector(() => entrada.current?.click()), [registrarSelector]);

  useEffect(() => {
    if (!archivo) return;
    let vigente = true;
    setAbierto(true);
    setLeyendo('leyendo');
    setError('');
    setLectura(null);
    setResultado(null);
    const nivel = perfil?.nivel;
    leerArchivo(archivo)
      .then(async (bloques) => {
        if (!vigente) return;
        const documento = estructurarDocumento(bloques, archivo.name);
        const texto = documento.secciones.map((s) => s.contenido).join('\n');
        const base: Lectura = {
          archivo: archivo.name,
          documento: { ...documento, organizadoPor: 'reglas' },
          fechas: fechasDeExamen(texto, new Date()),
        };
        // Con IA disponible, ella organiza los temas; si falla, se queda lo de las reglas propias.
        if (documento.palabras > 0 && (await iaDisponible())) {
          if (!vigente) return;
          setLeyendo('ia');
          try {
            const r = await organizarConIa(documento, archivo.name, nivel);
            if (vigente) setLectura({ ...base, documento: r.documento, fechaIa: r.fechaExamen });
            return;
          } catch (e) {
            base.avisoIa =
              e instanceof ErrorApi && e.estado === 413
                ? 'El documento es muy largo para la IA, así que lo organizamos con el modo automático.'
                : 'La IA no respondió esta vez, así que lo organizamos con el modo automático.';
          }
        }
        if (vigente) setLectura(base);
      })
      .catch((e: unknown) => {
        if (vigente)
          setError(
            e instanceof ErrorDocumento
              ? e.message
              : 'No se pudo leer el archivo. Prueba con otro.',
          );
      })
      .finally(() => {
        if (vigente) setLeyendo('');
        elegir(null);
        if (entrada.current) entrada.current.value = '';
      });
    return () => {
      vigente = false;
    };
    // El perfil solo se lee al empezar; no debe reiniciar la lectura si cambia.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [archivo, elegir]);

  function cerrar() {
    setAbierto(false);
    setLectura(null);
    setResultado(null);
    setError('');
  }

  return (
    <>
      <input
        ref={entrada}
        type="file"
        accept={TIPOS_ACEPTADOS}
        className="sr-only"
        tabIndex={-1}
        aria-label="Elegir documento"
        onChange={(e) => elegir(e.target.files?.[0] ?? null)}
      />
      <Dialogo abierto={abierto} titulo="Subir documento" onCerrar={cerrar} ancho="max-w-2xl">
        {leyendo && (
          <p role="status" className="py-6 text-center text-sm text-tinta-suave">
            {leyendo === 'ia'
              ? 'Analizando tus apuntes con IA y armando el plan… puede tardar un par de minutos.'
              : 'Leyendo el documento…'}
          </p>
        )}
        {error && (
          <div className="flex flex-col gap-3">
            <p
              role="alert"
              className="rounded-xl bg-peligro/10 px-3.5 py-2.5 text-sm font-semibold text-peligro"
            >
              {error}
            </p>
            <button
              className="boton-secundario self-start"
              onClick={() => entrada.current?.click()}
            >
              Elegir otro archivo
            </button>
          </div>
        )}
        {lectura && !resultado && perfil && (
          <Revision
            lectura={lectura}
            perfil={perfil}
            materias={materias ?? []}
            alTerminar={setResultado}
          />
        )}
        {resultado && (
          <div className="flex flex-col gap-4">
            <p role="status" className="text-sm">
              Listo: {resultado.temasNuevos}{' '}
              {resultado.temasNuevos === 1 ? 'tema nuevo' : 'temas nuevos'}
              {resultado.temasExistentes > 0 &&
                ` y ${resultado.temasExistentes} que ya tenías`}, {resultado.apuntes}{' '}
              {resultado.apuntes === 1 ? 'apunte' : 'apuntes'}
              {resultado.tarjetas > 0 && ` y ${resultado.tarjetas} tarjetas de repaso`}. Tu plan de
              estudio ya los tiene en cuenta.
            </p>
            <div className="flex flex-wrap gap-2">
              <a href={hrefDe('/notas')} className="boton-primario" onClick={cerrar}>
                Ver mi plan de estudio
              </a>
              <button
                className="boton-secundario"
                onClick={() => {
                  cerrar();
                  navegar('/apuntes');
                }}
              >
                Ver los apuntes
              </button>
            </div>
          </div>
        )}
      </Dialogo>
    </>
  );
}
