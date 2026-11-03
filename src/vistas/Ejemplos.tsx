import { db } from '@/db/db';
import { materiasDePerfil, temasDeMaterias } from '@/db/operaciones';
import { useConsulta } from '@/db/useConsulta';
import { usePerfil } from '@/estado/usePerfil';
import { hrefDe } from '@/app/enrutador';
import { EstadoVacio, Tarjeta } from '@/componentes/Tarjeta';
import { buscarGenerador, generadoresPorArea } from '@/dominio/ejemplos';
import { FormEjemplo } from './ejemplos/FormEjemplo';
import { ListaEjemplos } from './ejemplos/ListaEjemplos';
import { VistaEjemplo } from './ejemplos/VistaEjemplo';
import { VistaGenerador } from './ejemplos/VistaGenerador';

export function Ejemplos({ ejemploId }: { ejemploId?: string | undefined }) {
  const { perfil } = usePerfil();
  const datos = useConsulta(async () => {
    if (!perfil) return null;
    const materias = await materiasDePerfil(perfil.id);
    const nombre = new Map(materias.map((m) => [m.id, m.nombre]));
    const temas = (await temasDeMaterias(materias.map((m) => m.id))).map((t) => ({
      ...t,
      materia: nombre.get(t.materiaId) ?? '',
    }));
    const ids = temas.map((t) => t.id);
    const ejemplos = ids.length ? await db.ejemplos.where('temaId').anyOf(ids).toArray() : [];
    return { temas, ejemplos: ejemplos.sort((a, b) => a.titulo.localeCompare(b.titulo, 'es')) };
  }, [perfil?.id]);
  if (!perfil || !datos) return null;

  const temaPorId = new Map(datos.temas.map((t) => [t.id, t]));
  const porDefecto = generadoresPorArea(perfil.area).propios[0]?.id ?? 'g-plano-inclinado';
  const id = ejemploId ?? porDefecto;
  const generador = buscarGenerador(id);
  const editar = id.startsWith('editar:')
    ? datos.ejemplos.find((e) => e.id === id.slice(7))
    : undefined;
  const propio = datos.ejemplos.find((e) => e.id === id);

  let detalle;
  if (generador)
    detalle = <VistaGenerador key={generador.id} generador={generador} temas={datos.temas} />;
  else if (id === 'nuevo' || id.startsWith('nuevo:') || editar)
    detalle =
      datos.temas.length === 0 ? (
        <Tarjeta titulo="Nuevo ejemplo resuelto" icono="ejemplos">
          <EstadoVacio
            texto="Cada ejemplo va en un tema. Primero agrega una materia con sus temas."
            accion={
              <a href={hrefDe('/materias')} className="boton-secundario">
                Ir a materias
              </a>
            }
          />
        </Tarjeta>
      ) : (
        <FormEjemplo
          key={editar?.id ?? 'nuevo'}
          temas={datos.temas}
          inicial={editar}
          temaPorDefecto={id.startsWith('nuevo:') ? id.slice(6) : undefined}
        />
      );
  else if (propio) detalle = <VistaEjemplo ejemplo={propio} tema={temaPorId.get(propio.temaId)} />;
  else
    detalle = (
      <Tarjeta titulo="Ejemplo no encontrado" icono="ejemplos">
        <EstadoVacio texto="Este ejemplo ya no existe. Elige otro de la lista." />
      </Tarjeta>
    );

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
      <ListaEjemplos
        area={perfil.area}
        ejemplos={datos.ejemplos}
        temas={temaPorId}
        seleccion={editar?.id ?? id}
      />
      <div className="min-w-0">{detalle}</div>
    </div>
  );
}
