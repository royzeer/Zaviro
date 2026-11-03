import { lazy, Suspense, useEffect } from 'react';
import { useRutaActual } from '@/app/enrutador';
import { resolverRuta } from '@/app/rutas';
import { Marco } from '@/componentes/Marco';
import { aplicarTema, useApp } from '@/estado/app';
import { usePerfil } from '@/estado/usePerfil';
import { useSesion } from '@/estado/sesion';
import { useSincronizacionAutomatica } from '@/sincronizacion/useSincronizacionAutomatica';
import { Acceso } from '@/vistas/Acceso';
import { CentroDocumentos } from '@/vistas/apuntes/SubirDocumento';
import { Apuntes } from '@/vistas/Apuntes';
import { Bienvenida } from '@/vistas/Bienvenida';
import { EnConstruccion } from '@/vistas/EnConstruccion';
import { Errores } from '@/vistas/Errores';
import { Repasar } from '@/vistas/Repasar';
import { recalcularDominios } from '@/db/operaciones';
import { Inicio } from '@/vistas/Inicio';
import { Materias } from '@/vistas/Materias';
import { Perfil } from '@/vistas/Perfil';

// Las pantallas menos frecuentes se cargan por partes, solo cuando se abren.
const Ajustes = lazy(() => import('@/vistas/Ajustes').then((m) => ({ default: m.Ajustes })));
const NotasPlan = lazy(() => import('@/vistas/NotasPlan').then((m) => ({ default: m.NotasPlan })));
const Saber11 = lazy(() => import('@/vistas/Saber11').then((m) => ({ default: m.Saber11 })));
const Ejemplos = lazy(() => import('@/vistas/Ejemplos').then((m) => ({ default: m.Ejemplos })));
const SaberPro = lazy(() => import('@/vistas/SaberPro').then((m) => ({ default: m.SaberPro })));
const TrabajoGrado = lazy(() =>
  import('@/vistas/TrabajoGrado').then((m) => ({ default: m.TrabajoGrado })),
);
const Lecturas = lazy(() => import('@/vistas/Lecturas').then((m) => ({ default: m.Lecturas })));
const Bitacora = lazy(() => import('@/vistas/Bitacora').then((m) => ({ default: m.Bitacora })));

function Cargando() {
  return (
    <p role="status" className="py-10 text-center text-sm text-tinta-suave">
      Cargando…
    </p>
  );
}

function useTemaDelSistema() {
  const tema = useApp((s) => s.tema);
  useEffect(() => {
    aplicarTema(tema);
    if (tema !== 'sistema') return;
    const consulta = window.matchMedia('(prefers-color-scheme: dark)');
    const cambio = () => aplicarTema('sistema');
    consulta.addEventListener('change', cambio);
    return () => consulta.removeEventListener('change', cambio);
  }, [tema]);
}

export function App() {
  useTemaDelSistema();
  useSincronizacionAutomatica();
  const usuario = useSesion((s) => s.usuario);
  const preparando = useSesion((s) => s.preparando);
  if (!usuario) return <Acceso />;
  if (preparando) {
    return (
      <div className="grid min-h-dvh place-items-center bg-fondo px-4">
        <p role="status" className="text-sm font-semibold text-tinta-suave">
          Trayendo tus datos de estudio…
        </p>
      </div>
    );
  }
  return <AppConSesion />;
}

function AppConSesion() {
  useEffect(() => {
    // El dominio baja con el tiempo sin repasar: se actualiza al abrir la app.
    void recalcularDominios();
  }, []);
  const ruta = useRutaActual();
  const { cargando, perfil, vocab } = usePerfil();
  const resuelta = resolverRuta(ruta);
  const def = resuelta?.def;

  useEffect(() => {
    document.title = def && def.ruta !== '/' ? `${def.titulo} · Zaviro` : 'Zaviro';
    window.scrollTo({ top: 0 });
  }, [def]);

  if (cargando) return <div className="min-h-dvh bg-fondo" aria-busy="true" />;
  if (!perfil) return <Bienvenida primeraVez />;
  if (ruta === '/nuevo-perfil') return <Bienvenida primeraVez={false} />;

  if (!resuelta || !def) {
    return (
      <Marco titulo="Página no encontrada" descripcion="Esta dirección no existe en Zaviro.">
        <a href="#/" className="boton-primario">
          Volver al inicio
        </a>
      </Marco>
    );
  }

  const { parametro } = resuelta;
  let contenido;
  switch (def.ruta) {
    case '/':
      contenido = <Inicio />;
      break;
    case '/ajustes':
      contenido = <Ajustes />;
      break;
    case '/perfil':
      contenido = <Perfil />;
      break;
    case '/materias':
      contenido = <Materias materiaId={parametro} />;
      break;
    case '/notas':
      contenido = <NotasPlan />;
      break;
    case '/repasar':
      contenido = <Repasar />;
      break;
    case '/errores':
      contenido = <Errores />;
      break;
    case '/apuntes':
      contenido = <Apuntes apunteId={parametro} />;
      break;
    case '/ejemplos':
      contenido = <Ejemplos ejemploId={parametro} />;
      break;
    case '/saber11':
      contenido = <Saber11 />;
      break;
    case '/saber-pro':
      contenido = <SaberPro />;
      break;
    case '/trabajo-grado':
      contenido = <TrabajoGrado />;
      break;
    case '/lecturas':
      contenido = <Lecturas lecturaId={parametro} />;
      break;
    case '/bitacora':
      contenido = <Bitacora />;
      break;
    default:
      contenido = <EnConstruccion ruta={def} />;
  }

  return (
    <>
      <Marco
        titulo={def.ruta === '/materias' ? vocab.materias : def.titulo}
        descripcion={def.descripcion}
      >
        <div key={def.ruta}>
          <Suspense fallback={<Cargando />}>{contenido}</Suspense>
        </div>
      </Marco>
      <CentroDocumentos />
    </>
  );
}
