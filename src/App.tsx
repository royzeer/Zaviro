import { useEffect } from 'react';
import { useRutaActual } from '@/app/enrutador';
import { resolverRuta } from '@/app/rutas';
import { Marco } from '@/componentes/Marco';
import { aplicarTema, useApp } from '@/estado/app';
import { usePerfil } from '@/estado/usePerfil';
import { Ajustes } from '@/vistas/Ajustes';
import { Apuntes } from '@/vistas/Apuntes';
import { Bienvenida } from '@/vistas/Bienvenida';
import { EnConstruccion } from '@/vistas/EnConstruccion';
import { Inicio } from '@/vistas/Inicio';
import { Materias } from '@/vistas/Materias';
import { Perfil } from '@/vistas/Perfil';

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
    case '/apuntes':
      contenido = <Apuntes apunteId={parametro} />;
      break;
    default:
      contenido = <EnConstruccion ruta={def} />;
  }

  return (
    <Marco
      titulo={def.ruta === '/materias' ? vocab.materias : def.titulo}
      descripcion={def.descripcion}
    >
      <div key={def.ruta}>{contenido}</div>
    </Marco>
  );
}
