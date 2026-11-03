import { useEffect } from 'react';
import { useRutaActual } from '@/app/enrutador';
import { buscarRuta } from '@/app/rutas';
import { Marco } from '@/componentes/Marco';
import { aplicarTema, useApp } from '@/estado/app';
import { Ajustes } from '@/vistas/Ajustes';
import { EnConstruccion } from '@/vistas/EnConstruccion';
import { Inicio } from '@/vistas/Inicio';

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
  const def = buscarRuta(ruta);

  useEffect(() => {
    document.title = def && def.ruta !== '/' ? `${def.titulo} · Zaviro` : 'Zaviro';
    window.scrollTo({ top: 0 });
  }, [def]);

  if (!def) {
    return (
      <Marco titulo="Página no encontrada" descripcion="Esta dirección no existe en Zaviro.">
        <a href="#/" className="boton-primario">
          Volver al inicio
        </a>
      </Marco>
    );
  }

  let contenido;
  if (def.ruta === '/') contenido = <Inicio />;
  else if (def.ruta === '/ajustes') contenido = <Ajustes />;
  else contenido = <EnConstruccion ruta={def} />;

  return (
    <Marco titulo={def.titulo} descripcion={def.descripcion}>
      <div key={def.ruta}>{contenido}</div>
    </Marco>
  );
}
