import { db } from '@/db/db';
import { apuntesDeMaterias, materiasDePerfil, temasDeMaterias } from '@/db/operaciones';
import { useConsulta } from '@/db/useConsulta';
import { usePerfil } from '@/estado/usePerfil';
import { EstadoVacio } from '@/componentes/Tarjeta';
import { DetalleMateria } from './materias/DetalleMateria';
import { ListaMaterias } from './materias/ListaMaterias';

export function Materias({ materiaId }: { materiaId?: string }) {
  const { perfil } = usePerfil();
  const datos = useConsulta(async () => {
    if (!perfil) return null;
    const materias = await materiasDePerfil(perfil.id);
    const ids = materias.map((m) => m.id);
    const temas = await temasDeMaterias(ids);
    const apuntes = materiaId ? await apuntesDeMaterias([materiaId]) : [];
    const materia = materiaId ? await db.materias.get(materiaId) : undefined;
    return { materias, temas, apuntes, materia };
  }, [perfil?.id, materiaId]);

  if (!perfil || !datos) return null;

  if (materiaId) {
    if (!datos.materia || datos.materia.perfilId !== perfil.id) {
      return (
        <EstadoVacio
          texto="Esta materia no existe en el perfil activo."
          accion={
            <a href="#/materias" className="boton-secundario">
              Ver materias
            </a>
          }
        />
      );
    }
    return (
      <DetalleMateria
        perfil={perfil}
        materia={datos.materia}
        materias={datos.materias}
        temas={datos.temas
          .filter((t) => t.materiaId === materiaId)
          .sort((a, b) => a.titulo.localeCompare(b.titulo, 'es'))}
        apuntes={datos.apuntes}
      />
    );
  }
  return <ListaMaterias perfil={perfil} materias={datos.materias} temas={datos.temas} />;
}
