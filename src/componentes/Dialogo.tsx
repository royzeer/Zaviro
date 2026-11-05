import { useEffect, useRef, type ReactNode } from 'react';
import { Icono } from './Icono';

/** Ventana modal accesible basada en el elemento nativo <dialog>. */
export function Dialogo({
  abierto,
  titulo,
  onCerrar,
  children,
  ancho = 'max-w-lg',
}: {
  abierto: boolean;
  titulo: string;
  onCerrar: () => void;
  children: ReactNode;
  ancho?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (abierto && !d.open) d.showModal();
    if (!abierto && d.open) d.close();
  }, [abierto]);

  return (
    <dialog
      ref={ref}
      onClose={onCerrar}
      onCancel={(e) => {
        e.preventDefault();
        onCerrar();
      }}
      onClick={(e) => e.target === ref.current && onCerrar()}
      aria-label={titulo}
      className={`w-[calc(100%-2rem)] ${ancho} vidrio-fuerte rounded-tarjeta bg-superficie/90 p-0 text-tinta backdrop:bg-tinta/30 backdrop:backdrop-blur-md`}
    >
      {abierto && (
        <div className="flex max-h-[85dvh] flex-col">
          <header className="flex items-center justify-between gap-3 border-b border-linea/70 px-5 py-4">
            <h2 className="text-lg font-bold tracking-tight">{titulo}</h2>
            <button
              type="button"
              onClick={onCerrar}
              className="boton-fantasma p-2"
              aria-label="Cerrar"
            >
              <Icono nombre="cerrar" />
            </button>
          </header>
          <div className="overflow-y-auto px-5 py-5">{children}</div>
        </div>
      )}
    </dialog>
  );
}
