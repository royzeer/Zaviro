import type { ReactNode } from 'react';
import { hrefDe } from '@/app/enrutador';
import { Icono, type NombreIcono } from './Icono';

interface Props {
  titulo: string;
  icono?: NombreIcono;
  verTodo?: string;
  className?: string;
  children: ReactNode;
}

export function Tarjeta({ titulo, icono, verTodo, className = '', children }: Props) {
  return (
    <section className={`tarjeta animate-aparecer ${className}`} aria-label={titulo}>
      <header className="mb-4 flex items-center justify-between gap-3">
        <h2 className="titulo-tarjeta flex items-center gap-2">
          {icono && (
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-superficie-2 text-acento">
              <Icono nombre={icono} tamano={16} />
            </span>
          )}
          {titulo}
        </h2>
        {verTodo && (
          <a
            href={hrefDe(verTodo)}
            className="rounded-md text-xs font-semibold text-tinta-suave hover:text-tinta"
          >
            Ver todo
          </a>
        )}
      </header>
      {children}
    </section>
  );
}

export function EstadoVacio({ texto, accion }: { texto: string; accion?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-linea bg-superficie-2/50 p-4 text-sm text-tinta-suave">
      <p>{texto}</p>
      {accion}
    </div>
  );
}
