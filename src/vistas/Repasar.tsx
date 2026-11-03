import { useCallback, useEffect, useMemo, useState } from 'react';
import { db } from '@/db/db';
import type { PerfilAcademico, TarjetaRepaso } from '@/db/esquemas';
import {
  borrarTarjeta,
  materiasDePerfil,
  registrarRepaso,
  temasDeMaterias,
} from '@/db/operaciones';
import { useConsulta } from '@/db/useConsulta';
import {
  CALIFICACIONES,
  NOMBRE_CALIFICACION,
  sm2,
  tarjetasVencidas,
  textoIntervalo,
  type Calificacion,
} from '@/dominio/repaso';
import { usePerfil } from '@/estado/usePerfil';
import { Dialogo } from '@/componentes/Dialogo';
import { FormTarjeta } from '@/componentes/FormTarjeta';
import { Icono } from '@/componentes/Icono';
import { EstadoVacio, Tarjeta } from '@/componentes/Tarjeta';
import { confirmar } from '@/utilidades/confirmar';
import { distanciaDias } from '@/utilidades/fechas';

async function cargar(perfil: PerfilAcademico) {
  const materias = await materiasDePerfil(perfil.id);
  const materiaIds = new Set(materias.map((m) => m.id));
  const temas = await temasDeMaterias([...materiaIds]);
  const temaIds = new Set(temas.map((t) => t.id));
  const [apuntes, errores, todas] = await Promise.all([
    db.apuntes.toArray(),
    db.errores.toArray(),
    db.tarjetas.toArray(),
  ]);
  const materiaDeApunte = new Map(apuntes.map((a) => [a.id, a.materiaId]));
  const materiaDeError = new Map(errores.map((e) => [e.id, e.materiaId]));
  // Una tarjeta es de este perfil si su tema, apunte o error lo es. Las de bases y las manuales sin tema se ven en todos.
  const tarjetas = todas.filter((t) => {
    if (t.temaId) return temaIds.has(t.temaId);
    if (t.origenTipo === 'apunte') return materiaIds.has(materiaDeApunte.get(t.origenId) ?? '');
    if (t.origenTipo === 'error') return materiaIds.has(materiaDeError.get(t.origenId) ?? '');
    return true;
  });
  return { materias, temas, tarjetas };
}

const COLOR_BOTON: Record<Calificacion, string> = {
  olvide: 'border-peligro/40 hover:bg-peligro/10',
  dificil: 'border-oxido/40 hover:bg-oxido/10',
  bien: 'border-exito/40 hover:bg-exito/10',
  facil: 'border-exito/60 bg-exito/10 hover:bg-exito/20',
};

function Sesion({
  perfil,
  tarjetas,
  actuales,
  contexto,
}: {
  perfil: PerfilAcademico;
  /** Foto de las tarjetas al empezar la sesión. */
  tarjetas: TarjetaRepaso[];
  /** Estado actual de las tarjetas en la base. */
  actuales: TarjetaRepaso[];
  contexto: (t: TarjetaRepaso) => string;
}) {
  const porId = useMemo(() => new Map(tarjetas.map((t) => [t.id, t])), [tarjetas]);
  const [cola, setCola] = useState<string[]>(() => tarjetasVencidas(tarjetas).map((t) => t.id));
  const [visto, setVisto] = useState(false);
  const [hechas, setHechas] = useState(0);
  const [ocupado, setOcupado] = useState(false);
  const actual = cola[0] ? porId.get(cola[0]) : undefined;

  const calificar = useCallback(
    async (c: Calificacion) => {
      if (!actual || ocupado) return;
      setOcupado(true);
      // Se lee la versión guardada: si la tarjeta ya salió en esta sesión, su estado cambió.
      const fresca = (await db.tarjetas.get(actual.id)) ?? actual;
      await registrarRepaso(fresca, c, perfil.reglas);
      setCola((q) => (c === 'olvide' ? [...q.slice(1), q[0]!] : q.slice(1)));
      setHechas((n) => n + 1);
      setVisto(false);
      setOcupado(false);
    },
    [actual, ocupado, perfil.reglas],
  );

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, select, dialog')) return;
      if (!visto && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        setVisto(true);
      } else if (visto && ['1', '2', '3', '4'].includes(e.key)) {
        void calificar(CALIFICACIONES[Number(e.key) - 1]!);
      }
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [visto, calificar]);

  const total = hechas + cola.length;

  if (!actual) {
    const proxima = [...actuales].sort((a, b) => a.proximoRepaso.localeCompare(b.proximoRepaso))[0];
    return (
      <section
        className="tarjeta flex animate-aparecer flex-col items-center gap-3 py-12 text-center"
        aria-label="Sesión de repaso"
      >
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-exito/15 text-exito">
          <Icono nombre="repasar" tamano={28} />
        </span>
        <h2 className="text-xl font-extrabold">
          {hechas > 0 ? 'Terminaste por hoy' : 'No tienes repasos pendientes'}
        </h2>
        <p className="max-w-sm text-sm text-tinta-suave">
          {hechas > 0 ? `Repasaste ${hechas} ${hechas === 1 ? 'tarjeta' : 'tarjetas'}. ` : ''}
          {proxima
            ? `La próxima te toca ${distanciaDias(proxima.proximoRepaso)}.`
            : 'Crea tarjetas desde tus apuntes o tus errores.'}
        </p>
      </section>
    );
  }

  return (
    <section className="tarjeta flex animate-aparecer flex-col gap-5" aria-label="Sesión de repaso">
      <div className="flex items-center justify-between gap-3 text-xs font-semibold text-tinta-suave">
        <span>{contexto(actual)}</span>
        <span className="tabular-nums">
          {hechas + 1} de {total}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-superficie-2">
        <div
          className="h-full rounded-full bg-exito transition-[width] duration-300"
          style={{ width: `${(hechas / total) * 100}%` }}
        />
      </div>
      <div
        key={actual.id + String(visto)}
        className="flex min-h-[14rem] animate-aparecer flex-col justify-center gap-5 py-4"
      >
        <p className="whitespace-pre-wrap text-center text-xl font-bold leading-snug sm:text-2xl">
          {actual.frente}
        </p>
        {visto && (
          <div className="rounded-2xl border border-linea/70 bg-superficie-2/60 p-4">
            <p className="etiqueta">Respuesta</p>
            <p className="whitespace-pre-wrap">{actual.reverso || 'Sin respuesta escrita.'}</p>
          </div>
        )}
      </div>
      {!visto ? (
        <button
          type="button"
          className="boton-primario self-center px-8 py-3"
          onClick={() => setVisto(true)}
          autoFocus
        >
          Mostrar respuesta
          <kbd className="ml-1 rounded bg-sobre-primario/20 px-1.5 text-[11px]">Espacio</kbd>
        </button>
      ) : (
        <div
          className="grid grid-cols-2 gap-2 sm:grid-cols-4"
          role="group"
          aria-label="¿Qué tan bien la recordaste?"
        >
          {CALIFICACIONES.map((c, i) => (
            <button
              key={c}
              type="button"
              disabled={ocupado}
              onClick={() => void calificar(c)}
              className={`boton flex-col gap-0.5 border py-3 ${COLOR_BOTON[c]}`}
            >
              <span>{NOMBRE_CALIFICACION[c]}</span>
              <span className="text-xs font-medium text-tinta-suave">
                {textoIntervalo(sm2(actual, c, perfil.reglas.repaso.intervalosIniciales).intervalo)}{' '}
                · tecla {i + 1}
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

export function Repasar() {
  const { perfil } = usePerfil();
  const datos = useConsulta(() => (perfil ? cargar(perfil) : null), [perfil?.id]);
  const [sesion, setSesion] = useState(0);
  const [creando, setCreando] = useState(false);
  const [editando, setEditando] = useState<TarjetaRepaso | null>(null);
  const [busqueda, setBusqueda] = useState('');
  // La sesión toma una foto de la cola al empezar; se reinicia al pedir "Repasar de nuevo" o al cambiar de perfil.
  const [foto, setFoto] = useState<TarjetaRepaso[] | null>(null);
  useEffect(() => {
    if (datos && foto === null) setFoto(datos.tarjetas);
  }, [datos, foto]);
  useEffect(() => setFoto(null), [perfil?.id, sesion]);

  if (!perfil || !datos) return null;
  const tema = new Map(datos.temas.map((t) => [t.id, t]));
  const materia = new Map(datos.materias.map((m) => [m.id, m]));
  const contexto = (t: TarjetaRepaso) => {
    const te = t.temaId ? tema.get(t.temaId) : undefined;
    if (te) return `${materia.get(te.materiaId)?.nombre ?? ''} · ${te.titulo}`;
    return t.origenTipo === 'raiz' ? 'Base de un nivel anterior' : 'Sin tema';
  };
  const vencidas = tarjetasVencidas(datos.tarjetas).length;
  const texto = busqueda.trim().toLowerCase();
  const lista = datos.tarjetas
    .filter((t) => !texto || `${t.frente} ${t.reverso}`.toLowerCase().includes(texto))
    .sort((a, b) => a.proximoRepaso.localeCompare(b.proximoRepaso));

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[1.4fr_1fr]">
      <div className="flex flex-col gap-3">
        {foto && (
          <Sesion
            key={sesion}
            perfil={perfil}
            tarjetas={foto}
            actuales={datos.tarjetas}
            contexto={contexto}
          />
        )}
        <p className="text-xs text-tinta-suave">
          Usa Espacio para ver la respuesta y las teclas 1 a 4 para calificar. Si olvidas una
          tarjeta, vuelve a salir en esta misma sesión.
          {vencidas > 0 && foto && tarjetasVencidas(foto).length === 0 && (
            <button
              type="button"
              className="ml-2 font-semibold underline"
              onClick={() => setSesion((s) => s + 1)}
            >
              Hay {vencidas} nuevas para repasar
            </button>
          )}
        </p>
      </div>

      <Tarjeta titulo="Tus tarjetas" icono="apuntes">
        <div className="mb-3 flex gap-2">
          <input
            className="campo"
            type="search"
            placeholder="Buscar"
            aria-label="Buscar tarjetas"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <button
            type="button"
            className="boton-primario shrink-0"
            onClick={() => setCreando(true)}
          >
            <Icono nombre="mas" tamano={16} /> Nueva
          </button>
        </div>
        {lista.length === 0 ? (
          <EstadoVacio texto="Aún no tienes tarjetas. Créalas aquí, desde un apunte o desde un error." />
        ) : (
          <ul className="flex max-h-[32rem] flex-col divide-y divide-linea/70 overflow-y-auto">
            {lista.map((t) => (
              <li key={t.id} className="flex items-start gap-2 py-2.5">
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => setEditando(t)}
                >
                  <p className="line-clamp-2 text-sm font-semibold">{t.frente}</p>
                  <p className="text-xs text-tinta-suave">
                    {contexto(t)} ·{' '}
                    {t.proximoRepaso <= new Date().toISOString()
                      ? 'toca hoy'
                      : distanciaDias(t.proximoRepaso)}
                  </p>
                </button>
                <button
                  type="button"
                  className="boton-fantasma p-2"
                  aria-label="Borrar tarjeta"
                  onClick={() =>
                    confirmar('¿Borrar esta tarjeta y su historial?') && void borrarTarjeta(t.id)
                  }
                >
                  <Icono nombre="papelera" tamano={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>

      <Dialogo abierto={creando} titulo="Nueva tarjeta" onCerrar={() => setCreando(false)}>
        {creando && (
          <FormTarjeta
            inicial={{ origenTipo: 'manual', origenId: perfil.id, frente: '', reverso: '' }}
            temas={datos.temas}
            onListo={() => {
              setCreando(false);
              setSesion((s) => s + 1);
            }}
          />
        )}
      </Dialogo>
      <Dialogo
        abierto={Boolean(editando)}
        titulo="Editar tarjeta"
        onCerrar={() => setEditando(null)}
      >
        {editando && (
          <FormTarjeta
            existente={editando}
            inicial={{
              origenTipo: editando.origenTipo,
              origenId: editando.origenId,
              temaId: editando.temaId,
              frente: editando.frente,
              reverso: editando.reverso,
            }}
            temas={datos.temas}
            onListo={() => setEditando(null)}
          />
        )}
      </Dialogo>
    </div>
  );
}
