import { useEffect, useRef, useState } from 'react';
import { hrefDe } from '@/app/enrutador';
import { activarPerfil } from '@/db/operaciones';
import { NOMBRE_NIVEL } from '@/dominio/catalogo';
import { usePerfil } from '@/estado/usePerfil';
import { nombrePerfil } from '@/dominio/perfil';
import { Icono } from './Icono';

/** Botón del encabezado para cambiar de perfil académico. */
export function SelectorPerfil() {
  const { perfil, perfiles } = usePerfil();
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => !caja.current?.contains(e.target as Node) && setAbierto(false);
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && setAbierto(false);
    document.addEventListener('mousedown', fuera);
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('mousedown', fuera);
      document.removeEventListener('keydown', tecla);
    };
  }, [abierto]);

  return (
    <div className="relative" ref={caja}>
      <button
        type="button"
        onClick={() => setAbierto(!abierto)}
        aria-expanded={abierto}
        aria-haspopup="true"
        className="flex h-10 max-w-[15rem] items-center gap-2 rounded-xl border border-linea bg-superficie pl-1 pr-3 text-left text-sm font-semibold"
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-lateral text-lateral-tinta">
          <Icono nombre="perfil" tamano={18} />
        </span>
        <span className="hidden min-w-0 leading-tight sm:block">
          <span className="block truncate">
            {perfil ? NOMBRE_NIVEL[perfil.nivel] : 'Sin perfil'}
          </span>
          {perfil && (
            <span className="block truncate text-[11px] font-medium text-tinta-suave">
              {nombrePerfil(perfil)}
            </span>
          )}
        </span>
        <span className="sr-only">Cambiar de perfil</span>
      </button>
      {abierto && (
        <div className="absolute right-0 top-12 z-30 w-72 animate-aparecer rounded-2xl border border-linea bg-superficie p-2 shadow-flotante">
          <p className="px-2 pb-1 pt-1 text-[11px] font-bold uppercase tracking-wide text-tinta-suave">
            Perfiles
          </p>
          <ul>
            {perfiles.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => {
                    void activarPerfil(p.id);
                    setAbierto(false);
                  }}
                  aria-current={p.id === perfil?.id ? 'true' : undefined}
                  className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-superficie-2 ${p.id === perfil?.id ? 'bg-superficie-2' : ''}`}
                >
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${p.id === perfil?.id ? 'bg-exito' : 'bg-linea'}`}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">
                      {NOMBRE_NIVEL[p.nivel]}
                    </span>
                    <span className="block truncate text-xs text-tinta-suave">
                      {nombrePerfil(p)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-1 grid grid-cols-2 gap-1 border-t border-linea/70 pt-2">
            <a
              href={hrefDe('/perfil')}
              onClick={() => setAbierto(false)}
              className="boton-fantasma justify-start text-xs"
            >
              Editar perfil
            </a>
            <a
              href={hrefDe('/nuevo-perfil')}
              onClick={() => setAbierto(false)}
              className="boton-fantasma justify-start text-xs"
            >
              <Icono nombre="mas" tamano={14} /> Nuevo perfil
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
