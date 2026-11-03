import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useState } from 'react';
import { db } from '@/db/db';
import type { EntradaBitacora, PerfilAcademico } from '@/db/esquemas';
import { guardar, nuevoId } from '@/db/repositorio';
import { useConsulta } from '@/db/useConsulta';
import { usePerfil } from '@/estado/usePerfil';
import { Avisos, Campo, NumeroEntrada } from '@/componentes/Formulario';
import { Icono } from '@/componentes/Icono';
import { EstadoVacio, Tarjeta } from '@/componentes/Tarjeta';
import { resumenBitacora } from '@/dominio/bitacora';
import { confirmar } from '@/utilidades/confirmar';
import { fechaInputAIso, isoAFechaInput } from '@/utilidades/fechas';
import { duracion } from '@/utilidades/numeros';

function NuevaEntrada({
  perfil,
  hitos,
}: {
  perfil: PerfilAcademico;
  hitos: { id: string; titulo: string; fecha?: string | undefined }[];
}) {
  const [texto, setTexto] = useState('');
  const [horas, setHoras] = useState<number | null>(null);
  const [hitoId, setHitoId] = useState('');
  const [fecha, setFecha] = useState(() => isoAFechaInput(new Date().toISOString()));
  const [avisos, setAvisos] = useState<string[]>([]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const iso = fechaInputAIso(fecha);
    const faltan: string[] = [];
    if (!texto.trim()) faltan.push('Escribe qué avanzaste.');
    if (!iso) faltan.push('Elige la fecha.');
    if (horas !== null && (horas < 0 || horas > 24)) faltan.push('Las horas van de 0 a 24.');
    setAvisos(faltan);
    if (faltan.length || !iso) return;
    const entrada: EntradaBitacora = {
      id: nuevoId(),
      perfilId: perfil.id,
      fecha: iso,
      texto: texto.trim(),
    };
    if (horas !== null) entrada.horas = horas;
    if (hitoId) entrada.hitoId = hitoId;
    await guardar('bitacora', entrada);
    setTexto('');
    setHoras(null);
  }

  return (
    <Tarjeta titulo="Registrar avance" icono="mas">
      <form onSubmit={(e) => void enviar(e)} className="flex flex-col gap-3" noValidate>
        <Campo
          etiqueta="Qué avanzaste"
          ayuda="Unas líneas bastan: qué hiciste, qué encontraste y qué sigue."
        >
          {(id, ayuda) => (
            <textarea
              id={id}
              aria-describedby={ayuda}
              className="campo min-h-24"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />
          )}
        </Campo>
        <div className="grid gap-3 sm:grid-cols-3">
          <Campo etiqueta="Fecha">
            {(id) => (
              <input
                id={id}
                type="date"
                className="campo"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
            )}
          </Campo>
          <Campo etiqueta="Horas (opcional)">
            {(id) => (
              <NumeroEntrada
                id={id}
                valor={horas}
                vacioPermitido
                min={0}
                max={24}
                onCambio={setHoras}
              />
            )}
          </Campo>
          <Campo etiqueta="Hito (opcional)">
            {(id) => (
              <select
                id={id}
                className="campo"
                value={hitoId}
                onChange={(e) => setHitoId(e.target.value)}
              >
                <option value="">Ninguno</option>
                {[...hitos]
                  .sort((a, b) => (a.fecha ?? '9999').localeCompare(b.fecha ?? '9999'))
                  .map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.titulo}
                    </option>
                  ))}
              </select>
            )}
          </Campo>
        </div>
        <Avisos avisos={avisos} />
        <button type="submit" className="boton-primario self-end">
          Guardar avance
        </button>
      </form>
    </Tarjeta>
  );
}

export function Bitacora() {
  const { perfil } = usePerfil();
  const datos = useConsulta(async () => {
    if (!perfil) return null;
    return {
      entradas: await db.bitacora.where('perfilId').equals(perfil.id).toArray(),
      hitos: await db.hitos.where('perfilId').equals(perfil.id).toArray(),
    };
  }, [perfil?.id]);
  if (!perfil || !datos) return null;
  const r = resumenBitacora(datos.entradas);
  const hitoPorId = new Map(datos.hitos.map((h) => [h.id, h.titulo]));
  const ordenadas = [...datos.entradas].sort((a, b) => b.fecha.localeCompare(a.fecha));

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[1fr_1.2fr]">
      <div className="flex flex-col gap-5">
        <NuevaEntrada perfil={perfil} hitos={datos.hitos} />
        <Tarjeta titulo="Constancia" icono="notas">
          <dl className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-superficie-2 px-3 py-2.5">
              <dt className="text-xs font-semibold text-tinta-suave">Esta semana</dt>
              <dd className="text-lg font-extrabold tabular-nums">{duracion(r.horasSemana)}</dd>
            </div>
            <div className="rounded-xl bg-superficie-2 px-3 py-2.5">
              <dt className="text-xs font-semibold text-tinta-suave">Últimos 30 días</dt>
              <dd className="text-lg font-extrabold tabular-nums">{duracion(r.horas30)}</dd>
            </div>
            <div className="rounded-xl bg-superficie-2 px-3 py-2.5">
              <dt className="text-xs font-semibold text-tinta-suave">Días con avance</dt>
              <dd className="text-lg font-extrabold tabular-nums">{r.dias30} de 30</dd>
            </div>
          </dl>
          {r.diasSinRegistro !== null && r.diasSinRegistro >= 7 && (
            <p className="mt-3 rounded-xl bg-brillo/15 px-3 py-2.5 text-sm">
              Llevas {r.diasSinRegistro} días sin registrar avances. Aunque sea poco, anotarlo ayuda
              a no perder el hilo.
            </p>
          )}
        </Tarjeta>
      </div>
      <Tarjeta titulo="Bitácora" icono="bitacora">
        {ordenadas.length === 0 ? (
          <EstadoVacio texto="Tu bitácora está vacía. Registra lo que avances cada día de trabajo en tu investigación." />
        ) : (
          <ol className="flex flex-col gap-3">
            {ordenadas.map((e) => (
              <li key={e.id} className="border-l-2 border-linea pl-4">
                <div className="flex items-center gap-2">
                  <p className="flex-1 text-xs font-semibold text-tinta-suave first-letter:uppercase">
                    {format(parseISO(e.fecha), "EEEE d 'de' MMMM 'de' yyyy", { locale: es })}
                    {e.horas ? ` · ${duracion(e.horas)}` : ''}
                    {e.hitoId && hitoPorId.get(e.hitoId) ? ` · ${hitoPorId.get(e.hitoId)}` : ''}
                  </p>
                  <button
                    type="button"
                    className="boton-fantasma p-1.5"
                    aria-label="Borrar avance"
                    onClick={() => {
                      if (confirmar('¿Borrar este avance?')) void db.bitacora.delete(e.id);
                    }}
                  >
                    <Icono nombre="papelera" tamano={15} />
                  </button>
                </div>
                <p className="whitespace-pre-line text-sm">{e.texto}</p>
              </li>
            ))}
          </ol>
        )}
      </Tarjeta>
    </div>
  );
}
