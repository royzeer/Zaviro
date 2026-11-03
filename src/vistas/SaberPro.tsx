import { db } from '@/db/db';
import { useConsulta } from '@/db/useConsulta';
import { usePerfil } from '@/estado/usePerfil';
import { resumenSaberPro } from '@/dominio/saberPro';
import { Modulos } from './saberPro/Modulos';
import { NuevaPractica } from './saberPro/NuevaPractica';
import { Progreso } from './saberPro/Progreso';

const VENTANA = 3;

export function SaberPro() {
  const { perfil } = usePerfil();
  const datos = useConsulta(async () => {
    if (!perfil) return null;
    return {
      modulos: (await db.modulosSaberPro.where('perfilId').equals(perfil.id).toArray()).sort(
        (a, b) => a.tipo.localeCompare(b.tipo) || a.nombre.localeCompare(b.nombre, 'es'),
      ),
      practicas: await db.practicasSaberPro.where('perfilId').equals(perfil.id).toArray(),
    };
  }, [perfil?.id]);
  if (!perfil || !datos) return null;
  const examen = perfil.nivel === 'profesional' ? 'Saber Pro' : 'Saber TyT';
  return (
    <div className="grid items-start gap-5 xl:grid-cols-2">
      <div className="flex min-w-0 flex-col gap-5">
        <NuevaPractica perfil={perfil} modulos={datos.modulos} />
        <Modulos perfil={perfil} modulos={datos.modulos} examen={examen} />
      </div>
      <Progreso
        resumen={resumenSaberPro(datos.modulos, datos.practicas, VENTANA)}
        ventana={VENTANA}
      />
    </div>
  );
}
