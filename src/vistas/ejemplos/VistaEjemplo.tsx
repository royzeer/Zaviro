import { navegar } from '@/app/enrutador';
import { db } from '@/db/db';
import type { EjemploResuelto, Tema } from '@/db/esquemas';
import { Icono } from '@/componentes/Icono';
import { Tarjeta } from '@/componentes/Tarjeta';
import { enEquilibrio } from '@/dominio/fuerzas';
import { confirmar } from '@/utilidades/confirmar';
import { Solucion } from './Solucion';

export function VistaEjemplo({
  ejemplo,
  tema,
}: {
  ejemplo: EjemploResuelto;
  tema?: (Tema & { materia: string }) | undefined;
}) {
  return (
    <Tarjeta titulo={ejemplo.titulo} icono="ejemplos">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-tinta-suave">
          {tema ? `${tema.materia} · ${tema.titulo}` : 'Tema borrado'}
          {ejemplo.origen ? ' · copia de la biblioteca' : ''}
        </p>
        <div className="flex gap-1">
          <button
            type="button"
            className="boton-secundario px-3 py-1.5 text-xs"
            onClick={() => navegar(`/ejemplos/editar:${ejemplo.id}`)}
          >
            Editar
          </button>
          <button
            type="button"
            className="boton-fantasma p-2 text-peligro"
            aria-label="Borrar ejemplo"
            onClick={() => {
              if (confirmar('¿Borrar este ejemplo resuelto?'))
                void db.ejemplos.delete(ejemplo.id).then(() => navegar('/ejemplos'));
            }}
          >
            <Icono nombre="papelera" tamano={16} />
          </button>
        </div>
      </div>
      <Solucion
        enunciado={ejemplo.enunciado}
        pasos={ejemplo.pasos}
        comprobacion={ejemplo.comprobacion}
        diagrama={ejemplo.diagrama}
        comprobado={
          ejemplo.diagrama && ejemplo.diagrama.cuerpo === 'particula'
            ? enEquilibrio(ejemplo.diagrama.fuerzas, 1e-3) || undefined
            : undefined
        }
      />
    </Tarjeta>
  );
}
