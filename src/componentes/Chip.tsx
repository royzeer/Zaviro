import type { ReactNode } from 'react';

/** Botón tipo píldora para elegir opciones con un toque. */
export function ChipOpcion({
  activo,
  onClick,
  children,
  color,
  etiqueta,
}: {
  activo: boolean;
  onClick: () => void;
  children: ReactNode;
  color?: string;
  etiqueta?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      aria-label={etiqueta}
      className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors ${
        activo
          ? 'border-primario bg-primario text-sobre-primario'
          : 'border-linea bg-superficie text-tinta hover:bg-superficie-2'
      }`}
    >
      {color && <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />}
      {children}
    </button>
  );
}
