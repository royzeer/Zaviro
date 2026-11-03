import { useEffect, useRef, useState } from 'react';
import { db } from '@/db/db';
import { guardarAjuste, obtenerAjuste } from '@/db/repositorio';
import {
  exportarRespaldo,
  importarRespaldo,
  nombreArchivoRespaldo,
  validarRespaldo,
  type ProblemaRespaldo,
  type Respaldo as DatosRespaldo,
} from '@/db/respaldo';
import { useConsulta } from '@/db/useConsulta';
import { Icono } from '@/componentes/Icono';
import { Tarjeta } from '@/componentes/Tarjeta';
import { confirmar } from '@/utilidades/confirmar';
import { distanciaDias, fechaCorta } from '@/utilidades/fechas';

const CLAVE_ULTIMO = 'respaldo:ultimo';

type Pendiente = { respaldo: DatosRespaldo; total: number; perfiles: number; archivo: string };

function Almacenamiento() {
  const [estado, setEstado] = useState<{ persistente: boolean; usado?: number } | null>(null);
  const soportado = typeof navigator !== 'undefined' && !!navigator.storage?.persisted;
  useEffect(() => {
    if (!soportado) return;
    void (async () => {
      const persistente = await navigator.storage.persisted();
      const est = await navigator.storage.estimate?.();
      setEstado({ persistente, ...(est?.usage !== undefined ? { usado: est.usage } : {}) });
    })();
  }, [soportado]);
  if (!soportado || !estado) return null;
  return (
    <div className="mt-4 rounded-xl bg-superficie-2/70 px-3 py-2.5 text-sm">
      <p>
        {estado.persistente
          ? 'El navegador guardará tus datos de forma persistente: no los borrará para liberar espacio.'
          : 'El navegador podría borrar tus datos si se queda sin espacio. Pide almacenamiento persistente para evitarlo.'}
        {estado.usado !== undefined &&
          ` Ocupan unos ${Math.max(1, Math.round(estado.usado / 1024))} KB.`}
      </p>
      {!estado.persistente && (
        <button
          type="button"
          className="boton-secundario mt-2 px-3 py-1.5 text-xs"
          onClick={() =>
            void navigator.storage
              .persist()
              .then((p) => setEstado((e) => ({ ...e, persistente: p })))
          }
        >
          Pedir almacenamiento persistente
        </button>
      )}
    </div>
  );
}

export function Respaldo({ soloImportar = false }: { soloImportar?: boolean }) {
  const ultimo = useConsulta(() => obtenerAjuste<string>(CLAVE_ULTIMO));
  const archivo = useRef<HTMLInputElement>(null);
  const [pendiente, setPendiente] = useState<Pendiente | null>(null);
  const [problemas, setProblemas] = useState<ProblemaRespaldo[]>([]);
  const [modo, setModo] = useState<'combinar' | 'reemplazar'>('combinar');
  const [mensaje, setMensaje] = useState('');

  async function descargar() {
    const ahora = new Date();
    const datos = await exportarRespaldo(db, ahora);
    const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivoRespaldo(ahora);
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    await guardarAjuste(CLAVE_ULTIMO, ahora.toISOString());
    setMensaje(
      `Se descargó ${a.download}. Guárdalo en un lugar seguro, por ejemplo tu nube personal.`,
    );
  }

  async function leer(f: File) {
    setPendiente(null);
    setProblemas([]);
    setMensaje('');
    let json: unknown;
    try {
      json = JSON.parse(await f.text());
    } catch {
      setProblemas([{ tabla: 'archivo', mensaje: 'El archivo no es un JSON válido.' }]);
      return;
    }
    const v = validarRespaldo(json);
    if (!v.valido) {
      setProblemas(v.problemas);
      return;
    }
    const total = Object.values(v.conteo).reduce((s, n) => s + n, 0);
    setPendiente({ respaldo: v.respaldo, total, perfiles: v.conteo.perfiles, archivo: f.name });
  }

  async function importar() {
    if (!pendiente) return;
    if (
      modo === 'reemplazar' &&
      !confirmar('Se borrará todo lo que tienes ahora y quedará solo lo del respaldo. ¿Continuar?')
    )
      return;
    const n = await importarRespaldo(pendiente.respaldo, modo);
    setPendiente(null);
    if (archivo.current) archivo.current.value = '';
    setMensaje(`Listo: se importaron ${n} registros.`);
  }

  const contenido = (
    <>
      {!soloImportar && (
        <p className="mb-4 text-sm text-tinta-suave">
          Tus datos se guardan en tu cuenta. Si además quieres una copia propia, descarga un
          respaldo en JSON; también sirve para traer datos de otra cuenta.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {!soloImportar && (
          <button type="button" className="boton-primario" onClick={() => void descargar()}>
            Descargar respaldo
          </button>
        )}
        <label className="boton-secundario cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-acento">
          <Icono nombre="mas" tamano={16} />
          Importar respaldo
          <input
            ref={archivo}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void leer(f);
            }}
          />
        </label>
      </div>
      {!soloImportar && (
        <p className="mt-2 text-xs text-tinta-suave">
          {ultimo
            ? `Último respaldo: ${fechaCorta(ultimo)} (${distanciaDias(ultimo)}).`
            : 'Aún no has descargado ningún respaldo.'}
        </p>
      )}

      {problemas.length > 0 && (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-peligro/30 bg-peligro/5 p-3 text-sm text-peligro"
        >
          <p className="font-semibold">No se importó nada: el archivo tiene problemas.</p>
          <ul className="mt-1 list-disc pl-5">
            {problemas.map((p, i) => (
              <li key={i}>
                {p.tabla}
                {p.indice !== undefined ? ` (registro ${p.indice + 1})` : ''}: {p.mensaje}
              </li>
            ))}
          </ul>
        </div>
      )}

      {pendiente && (
        <div className="mt-4 rounded-xl border border-linea p-3 text-sm">
          <p>
            <span className="font-semibold">{pendiente.archivo}</span>: {pendiente.total} registros,{' '}
            {pendiente.perfiles} {pendiente.perfiles === 1 ? 'perfil' : 'perfiles'}, exportado el{' '}
            {fechaCorta(pendiente.respaldo.exportadoEn)}.
          </p>
          <fieldset className="mt-3 flex flex-col gap-2">
            <legend className="etiqueta">Cómo importar</legend>
            {(
              [
                [
                  'combinar',
                  'Combinar',
                  'Agrega lo del respaldo a lo que ya tienes. Si un registro existe en los dos, queda el del respaldo.',
                ],
                [
                  'reemplazar',
                  'Reemplazar todo',
                  'Borra lo que tienes ahora y deja exactamente lo del respaldo.',
                ],
              ] as const
            ).map(([valor, titulo, ayuda]) => (
              <label key={valor} className="flex cursor-pointer gap-2">
                <input
                  type="radio"
                  name="modo-importar"
                  value={valor}
                  checked={modo === valor}
                  onChange={() => setModo(valor)}
                  className="mt-1 accent-[rgb(var(--primario))]"
                />
                <span>
                  <span className="font-semibold">{titulo}</span>
                  <span className="block text-xs text-tinta-suave">{ayuda}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" className="boton-fantasma" onClick={() => setPendiente(null)}>
              Cancelar
            </button>
            <button type="button" className="boton-primario" onClick={() => void importar()}>
              Importar
            </button>
          </div>
        </div>
      )}
      <p className="mt-3 min-h-5 text-sm text-tinta-suave" role="status">
        {mensaje}
      </p>
      {!soloImportar && <Almacenamiento />}
    </>
  );
  if (soloImportar) return <div>{contenido}</div>;
  return (
    <Tarjeta titulo="Respaldo" icono="apuntes">
      {contenido}
    </Tarjeta>
  );
}
