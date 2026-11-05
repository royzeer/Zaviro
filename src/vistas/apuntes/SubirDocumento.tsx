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
  analizarSecciones,
  estructurarDocumento,
  fechasDeExamen,
  normalizarPalabra,
  pesosDeSecciones,
  tarjetasDeSeccion,
  type DocumentoLeido,
  type FechaExamen,
} from '@/dominio/documentos';
import { investigarSecciones } from '@/documentos/investigar';
import { ErrorDocumento, leerArchivo, TIPOS_ACEPTADOS } from '@/documentos/leer';
import { Dialogo } from '@/componentes/Dialogo';
import { Icono } from '@/componentes/Icono';
import { fechaInputAIso } from '@/utilidades/fechas';

interface Lectura {
  archivo: string;
  documento: DocumentoLeido;
  fechas: FechaExamen[];
  /** Temas con resumen encontrado en internet (null si no se pudo buscar). */
  conInternet: number | null;
}

const DIFICULTAD = { baja: 'Fácil', media: 'Media', alta: 'Difícil' } as const;
/** Más temas que esto no se investigan, para no tardar demasiado. */
const MAX_TEMAS_INTERNET = 25;

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
  const { documento, fechas } = lectura;
  const [materiaId, setMateriaId] = useState(() =>
    materiaSugerida(documento, lectura.archivo, materias),
  );
  const [nombre, setNombre] = useState(documento.titulo);
  const [elegidas, setElegidas] = useState(() => documento.secciones.map((_, i) => i));
  const materia = materias.find((m) => m.id === materiaId);
  const [fecha, setFecha] = useState(() =>
    fechas[0] ? format(fechas[0].fecha, 'yyyy-MM-dd') : '',
  );
  const [tarjetas, setTarjetas] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const pesos = pesosDeSecciones(elegidas.map((i) => documento.secciones[i]!));
  const cantidadDefiniciones = elegidas.reduce(
    (s, i) => s + tarjetasDeSeccion(documento.secciones[i]!, 8).length,
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
      <p className="text-sm text-tinta-suave">
        Leímos <strong className="text-tinta">{lectura.archivo}</strong>: {documento.palabras}{' '}
        palabras en {documento.secciones.length}{' '}
        {documento.secciones.length === 1 ? 'sección' : 'secciones'}. Cada sección será un tema con
        su apunte, y entrará solo a tu plan de estudio con un peso según lo importante que es.
        {lectura.conInternet
          ? ` Buscamos en internet y agregamos información y enlaces a ${lectura.conInternet} ${lectura.conInternet === 1 ? 'tema' : 'temas'}.`
          : lectura.conInternet === 0
            ? ' Agregamos enlaces para buscar cada tema en internet.'
            : ''}
      </p>

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
              {fechas[0]
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
          {cantidadDefiniciones === 1 ? 'tarjeta de repaso' : 'tarjetas de repaso'} con las
          definiciones, listas y resúmenes que encontramos
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
  const [leyendo, setLeyendo] = useState<'' | 'leyendo' | 'internet'>('');
  const [avance, setAvance] = useState({ hechas: 0, total: 0 });
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
    leerArchivo(archivo)
      .then(async (bloques) => {
        if (!vigente) return;
        const documento = analizarSecciones(estructurarDocumento(bloques, archivo.name));
        const texto = documento.secciones.map((s) => s.contenido).join('\n');
        const fechas = fechasDeExamen(texto, new Date());
        let conInternet: number | null = null;
        let secciones = documento.secciones;
        // Con internet, cada tema se busca en varias páginas; sin internet se sigue igual.
        const aInvestigar = secciones.slice(0, MAX_TEMAS_INTERNET);
        if (navigator.onLine && aInvestigar.length > 0) {
          setLeyendo('internet');
          setAvance({ hechas: 0, total: aInvestigar.length });
          const r = await investigarSecciones(aInvestigar, documento.titulo, (hechas) => {
            if (vigente) setAvance({ hechas, total: aInvestigar.length });
          });
          secciones = [...r.secciones, ...secciones.slice(MAX_TEMAS_INTERNET)];
          conInternet = r.conResumen;
        }
        if (vigente)
          setLectura({
            archivo: archivo.name,
            documento: { ...documento, secciones },
            fechas,
            conInternet,
          });
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
            {leyendo === 'internet'
              ? `Buscando cada tema en internet… ${avance.hechas} de ${avance.total}`
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
