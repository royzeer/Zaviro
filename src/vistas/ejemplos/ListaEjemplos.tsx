import { hrefDe } from '@/app/enrutador';
import type { EjemploResuelto, Tema } from '@/db/esquemas';
import { Tarjeta } from '@/componentes/Tarjeta';
import { NOMBRE_AREA, type Area } from '@/dominio/catalogo';
import { generadoresPorArea, type Generador } from '@/dominio/ejemplos';

function Enlace({
  id,
  titulo,
  detalle,
  activo,
}: {
  id: string;
  titulo: string;
  detalle: string;
  activo: boolean;
}) {
  return (
    <li>
      <a
        href={hrefDe(`/ejemplos/${id}`)}
        aria-current={activo ? 'page' : undefined}
        className={`block rounded-xl px-3 py-2.5 ${activo ? 'bg-primario text-sobre-primario' : 'bg-superficie-2/70 hover:bg-superficie-2'}`}
      >
        <span className="block text-sm font-semibold">{titulo}</span>
        <span className={`block text-xs ${activo ? 'opacity-80' : 'text-tinta-suave'}`}>
          {detalle}
        </span>
      </a>
    </li>
  );
}

export function ListaEjemplos({
  area,
  ejemplos,
  temas,
  seleccion,
}: {
  area: Area;
  ejemplos: EjemploResuelto[];
  temas: Map<string, Tema & { materia: string }>;
  seleccion?: string | undefined;
}) {
  const { propios, otros } = generadoresPorArea(area);
  const grupo = (titulo: string, lista: Generador[]) =>
    lista.length > 0 && (
      <div>
        <p className="etiqueta">{titulo}</p>
        <ul className="flex flex-col gap-1.5">
          {lista.map((g) => (
            <Enlace
              key={g.id}
              id={g.id}
              titulo={g.titulo}
              detalle={g.tema}
              activo={seleccion === g.id}
            />
          ))}
        </ul>
      </div>
    );
  return (
    <Tarjeta titulo="Ejemplos" icono="ejemplos">
      <div className="flex flex-col gap-5">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="etiqueta mb-0">Mis ejemplos</p>
            <a href={hrefDe('/ejemplos/nuevo')} className="text-xs font-semibold underline">
              Nuevo
            </a>
          </div>
          {ejemplos.length === 0 ? (
            <p className="text-sm text-tinta-suave">
              Guarda una copia de la biblioteca o escribe los tuyos, cada uno en un tema.
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {ejemplos.map((e) => {
                const t = temas.get(e.temaId);
                return (
                  <Enlace
                    key={e.id}
                    id={e.id}
                    titulo={e.titulo}
                    detalle={t ? `${t.materia} · ${t.titulo}` : 'Sin tema'}
                    activo={seleccion === e.id}
                  />
                );
              })}
            </ul>
          )}
        </div>
        {grupo(`Biblioteca de ${NOMBRE_AREA[area].toLowerCase()}`, propios)}
        {grupo('Otras áreas', otros)}
      </div>
    </Tarjeta>
  );
}
