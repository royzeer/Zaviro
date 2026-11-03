import { db } from '@/db/db';
import { materiasDePerfil } from '@/db/operaciones';
import { useConsulta } from '@/db/useConsulta';
import { usePerfil } from '@/estado/usePerfil';
import { ListaHitos } from './trabajoGrado/ListaHitos';
import { Calendario, ReglaPromedio, Resumen } from './trabajoGrado/Resumen';

export function TrabajoGrado() {
  const { perfil } = usePerfil();
  const datos = useConsulta(async () => {
    if (!perfil) return null;
    return {
      hitos: await db.hitos.where('perfilId').equals(perfil.id).toArray(),
      materias: await materiasDePerfil(perfil.id),
    };
  }, [perfil?.id]);
  if (!perfil || !datos) return null;
  const doctorado = perfil.nivel === 'doctorado';
  return (
    <div className="grid items-start gap-5 xl:grid-cols-[1.3fr_1fr]">
      <ListaHitos
        perfil={perfil}
        hitos={datos.hitos}
        titulo={doctorado ? 'Hitos de investigación' : 'Hitos del trabajo de grado'}
      />
      <div className="flex flex-col gap-5">
        <Resumen hitos={datos.hitos} />
        <Calendario hitos={datos.hitos} />
        <ReglaPromedio perfil={perfil} materias={datos.materias} />
      </div>
    </div>
  );
}
