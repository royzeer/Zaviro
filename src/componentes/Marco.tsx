import { useEffect, useRef, type ReactNode } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { hrefDe, useRutaActual } from '@/app/enrutador';
import { rutasVisibles, type DefinicionRuta } from '@/app/rutas';
import { usePerfil } from '@/estado/usePerfil';
import { useSesion } from '@/estado/sesion';
import { textoSincronizacion, textoSincronizacionCorto } from '@/sincronizacion/texto';
import { SelectorPerfil } from './SelectorPerfil';
import { useApp, temaEfectivo } from '@/estado/app';
import { Icono } from './Icono';

const CONSEJOS = [
  'Registrar un error justo después de cometerlo toma menos de un minuto y vale más que releer el tema.',
  'Una raíz compartida que arreglas hoy mejora varias materias a la vez.',
  'Repasar un poco cada día rinde más que una jornada larga antes del parcial.',
  'Explica el paso que más te costó con tus palabras: si no puedes, ahí está la raíz.',
];

function consejoDelDia(fecha: Date) {
  const dia = Math.floor(fecha.getTime() / 86_400_000);
  return CONSEJOS[dia % CONSEJOS.length];
}

function saludo(fecha: Date) {
  const h = fecha.getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function EnlaceNav({
  r,
  activa,
  onClick,
}: {
  r: DefinicionRuta;
  activa: boolean;
  onClick?: () => void;
}) {
  return (
    <a
      href={hrefDe(r.ruta)}
      onClick={onClick}
      aria-current={activa ? 'page' : undefined}
      className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
        activa
          ? 'bg-superficie/90 text-tinta shadow-tarjeta'
          : 'text-lateral-tinta hover:bg-lateral-tinta/10 hover:text-lateral-tinta'
      }`}
    >
      <Icono nombre={r.icono} tamano={19} className={activa ? 'text-acento' : ''} />
      {r.titulo}
    </a>
  );
}

function Navegacion({ onNavegar }: { onNavegar?: () => void }) {
  const actual = useRutaActual();
  const { perfil } = usePerfil();
  const rutas = rutasVisibles(perfil?.modulosActivos);
  const grupos: { titulo?: string; rutas: DefinicionRuta[] }[] = [
    { rutas: rutas.filter((r) => r.grupo === 'principal') },
    { titulo: 'Tu nivel', rutas: rutas.filter((r) => r.grupo === 'nivel') },
    { rutas: rutas.filter((r) => r.grupo === 'sistema') },
  ];
  return (
    <nav aria-label="Secciones" className="flex flex-col gap-5">
      {grupos
        .filter((g) => g.rutas.length > 0)
        .map((g, i) => (
          <div key={i} className="flex flex-col gap-1">
            {g.titulo && (
              <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-lateral-tinta">
                {g.titulo}
              </p>
            )}
            {g.rutas.map((r) => (
              <EnlaceNav
                key={r.ruta}
                r={r}
                activa={actual === r.ruta || actual.startsWith(`${r.ruta}/`)}
                onClick={onNavegar}
              />
            ))}
          </div>
        ))}
    </nav>
  );
}

function Marca() {
  return (
    <a href={hrefDe('/')} className="flex items-center gap-3 rounded-xl px-1">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-primario text-sobre-primario shadow-tarjeta">
        <Icono nombre="raiz" tamano={22} />
      </span>
      <span className="leading-tight">
        <span className="block text-lg font-extrabold tracking-tight text-lateral-tinta">
          Zaviro
        </span>
        <span className="block text-xs font-medium text-lateral-tinta">Tu espacio de estudio</span>
      </span>
    </a>
  );
}

function TarjetaConsejo() {
  return (
    <div className="rounded-2xl bg-lateral-tinta/10 p-4 text-lateral-tinta">
      <p className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wide">
        <Icono nombre="bombilla" tamano={16} />
        Consejo del día
      </p>
      <p className="text-[13px] leading-snug text-lateral-tinta">{consejoDelDia(new Date())}</p>
    </div>
  );
}

function EstadoNube() {
  const sincronizacion = useSesion((s) => s.sincronizacion);
  const { estado, pendientes } = sincronizacion;
  // Verde: todo subido. Rojo: no se pudo sincronizar. Gris: subiendo o por subir en un momento.
  const color =
    estado === 'sinConexion' || estado === 'error'
      ? 'bg-peligro'
      : estado === 'inactivo' && pendientes === 0
        ? 'bg-exito'
        : 'bg-lateral-tinta/50';
  return (
    <a
      href={hrefDe('/ajustes')}
      className="mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-lateral-tinta hover:bg-lateral-tinta/10"
    >
      <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${color}`} />
      <span className="min-w-0 truncate" title={textoSincronizacion(sincronizacion)}>
        {textoSincronizacionCorto(sincronizacion)}
      </span>
    </a>
  );
}

function BarraLateral() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-[17.5rem] shrink-0 p-3 pr-0 lg:block">
      <div className="vidrio-fuerte flex h-full flex-col gap-6 overflow-y-auto rounded-[1.75rem] p-5">
        <Marca />
        <Navegacion />
        <div className="mt-auto">
          <TarjetaConsejo />
          <EstadoNube />
        </div>
      </div>
    </aside>
  );
}

function MenuMovil() {
  const abierto = useApp((s) => s.menuAbierto);
  const cerrar = useApp((s) => s.setMenuAbierto);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const previo = document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLElement>('a,button')?.focus();
    const alTeclear = (e: KeyboardEvent) => e.key === 'Escape' && cerrar(false);
    window.addEventListener('keydown', alTeclear);
    return () => {
      window.removeEventListener('keydown', alTeclear);
      previo?.focus();
    };
  }, [abierto, cerrar]);

  if (!abierto) return null;
  return (
    <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú">
      <button
        className="absolute inset-0 bg-tinta/40 backdrop-blur-[2px]"
        aria-label="Cerrar menú"
        onClick={() => cerrar(false)}
      />
      <div
        ref={panel}
        className="vidrio-fuerte absolute inset-y-2 left-2 flex w-[82%] max-w-xs animate-aparecer flex-col gap-6 overflow-y-auto rounded-[1.75rem] bg-superficie/80 p-5"
      >
        <div className="flex items-center justify-between">
          <Marca />
          <button
            className="rounded-lg p-2 text-lateral-tinta hover:bg-lateral-tinta/10"
            onClick={() => cerrar(false)}
            aria-label="Cerrar menú"
          >
            <Icono nombre="cerrar" />
          </button>
        </div>
        <Navegacion onNavegar={() => cerrar(false)} />
        <div className="mt-auto">
          <TarjetaConsejo />
          <EstadoNube />
        </div>
      </div>
    </div>
  );
}

const RUTAS_BARRA_INFERIOR = ['/', '/materias', '/errores', '/repasar'];

function BarraInferior() {
  const actual = useRutaActual();
  const abrir = useApp((s) => s.setMenuAbierto);
  return (
    <nav
      aria-label="Accesos rápidos"
      className="vidrio-fuerte fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 rounded-[1.5rem] bg-superficie/75 lg:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {rutasVisibles(undefined)
          .filter((r) => RUTAS_BARRA_INFERIOR.includes(r.ruta))
          .map((r) => {
            const activa = actual === r.ruta || (r.ruta !== '/' && actual.startsWith(`${r.ruta}/`));
            return (
              <li key={r.ruta}>
                <a
                  href={hrefDe(r.ruta)}
                  aria-current={activa ? 'page' : undefined}
                  className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold ${
                    activa ? 'text-tinta' : 'text-tinta-suave'
                  }`}
                >
                  <span
                    className={`rounded-full px-3 py-1 ${activa ? 'bg-primario text-sobre-primario' : ''}`}
                  >
                    <Icono nombre={r.icono} tamano={20} />
                  </span>
                  {r.titulo}
                </a>
              </li>
            );
          })}
        <li>
          <button
            onClick={() => abrir(true)}
            className="flex w-full flex-col items-center gap-1 py-2.5 text-[11px] font-semibold text-tinta-suave"
          >
            <span className="px-3 py-1">
              <Icono nombre="menu" tamano={20} />
            </span>
            Más
          </button>
        </li>
      </ul>
    </nav>
  );
}

function BotonTema() {
  const tema = useApp((s) => s.tema);
  const setTema = useApp((s) => s.setTema);
  const oscuro = temaEfectivo(tema) === 'oscuro';
  return (
    <button
      onClick={() => setTema(oscuro ? 'claro' : 'oscuro')}
      className="vidrio grid h-10 w-10 place-items-center rounded-full text-tinta-suave hover:text-tinta"
      aria-label={oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      title={oscuro ? 'Modo claro' : 'Modo oscuro'}
    >
      <Icono nombre={oscuro ? 'sol' : 'luna'} />
    </button>
  );
}

function Encabezado({ titulo, descripcion }: { titulo: string; descripcion: string }) {
  const ahora = new Date();
  const esInicio = useRutaActual() === '/';
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex min-w-0 items-start gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-[2rem] sm:leading-tight">
            {esInicio ? `${saludo(ahora)}` : titulo}
          </h1>
          <p className="mt-1 text-sm text-tinta-suave">
            {esInicio ? 'Este es el resumen de tu estudio para hoy.' : descripcion}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="vidrio hidden h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold text-tinta-suave sm:flex">
          <Icono nombre="calendario" tamano={16} />
          <time dateTime={ahora.toISOString()}>
            {format(ahora, "EEEE d 'de' MMMM", { locale: es })}
          </time>
        </div>
        <BotonTema />
        <SelectorPerfil />
      </div>
    </header>
  );
}

export function Marco({
  titulo,
  descripcion,
  children,
}: {
  titulo: string;
  descripcion: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh">
      <a
        href="#contenido"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById('contenido')?.focus();
        }}
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primario focus:px-4 focus:py-2 focus:text-sobre-primario"
      >
        Saltar al contenido
      </a>
      <BarraLateral />
      <MenuMovil />
      <div className="flex min-w-0 flex-1 flex-col">
        <main
          id="contenido"
          tabIndex={-1}
          className="mx-auto w-full max-w-7xl flex-1 px-4 pb-28 pt-5 outline-none sm:px-6 lg:px-10 lg:pb-12 lg:pt-8"
        >
          <Encabezado titulo={titulo} descripcion={descripcion} />
          <div className="mt-6 lg:mt-8">{children}</div>
        </main>
      </div>
      <BarraInferior />
    </div>
  );
}
