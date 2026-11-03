import type { DefinicionRuta } from '@/app/rutas';
import { Icono } from '@/componentes/Icono';
import { Tarjeta } from '@/componentes/Tarjeta';

export function EnConstruccion({ ruta }: { ruta: DefinicionRuta }) {
  return (
    <Tarjeta titulo={ruta.titulo} icono={ruta.icono}>
      <div className="flex flex-col items-start gap-3 py-6">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-superficie-2 text-acento">
          <Icono nombre={ruta.icono} tamano={24} />
        </span>
        <p className="max-w-prose text-sm text-tinta-suave">
          {ruta.descripcion} Esta sección se está construyendo y estará disponible pronto.
        </p>
      </div>
    </Tarjeta>
  );
}
