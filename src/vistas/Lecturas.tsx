import { db } from '@/db/db';
import { useConsulta } from '@/db/useConsulta';
import { usePerfil } from '@/estado/usePerfil';
import { BancoCitas } from './lecturas/BancoCitas';
import { DetalleLectura } from './lecturas/DetalleLectura';
import { ListaLecturas } from './lecturas/ListaLecturas';

export function Lecturas({ lecturaId }: { lecturaId?: string | undefined }) {
  const { perfil } = usePerfil();
  const lecturas = useConsulta(
    () => (perfil ? db.lecturas.where('perfilId').equals(perfil.id).toArray() : []),
    [perfil?.id],
  );
  if (!perfil || !lecturas) return null;
  const actual = lecturas.find((l) => l.id === lecturaId);
  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,22rem)_1fr]">
      <ListaLecturas perfil={perfil} lecturas={lecturas} seleccion={lecturaId} />
      <div className="flex flex-col gap-5">
        {actual && <DetalleLectura lectura={actual} />}
        <BancoCitas lecturas={lecturas} />
      </div>
    </div>
  );
}
