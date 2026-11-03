import { db } from '@/db/db';
import { useConsulta } from '@/db/useConsulta';
import { usePerfil } from '@/estado/usePerfil';
import { evolucion, pruebasPorReforzar } from '@/dominio/saber11';
import { Evolucion } from './saber11/Evolucion';
import { Historial } from './saber11/Historial';
import { NuevoSimulacro } from './saber11/NuevoSimulacro';
import { Reforzar } from './saber11/Reforzar';

const VENTANA = 3;

export function Saber11() {
  const { perfil } = usePerfil();
  const simulacros = useConsulta(
    () => (perfil ? db.simulacros.where('perfilId').equals(perfil.id).toArray() : []),
    [perfil?.id],
  );
  if (!perfil || !simulacros) return null;
  const puntos = evolucion(simulacros);
  return (
    <div className="grid items-start gap-5 xl:grid-cols-2">
      <div className="flex min-w-0 flex-col gap-5">
        <NuevoSimulacro perfil={perfil} />
        <Historial simulacros={simulacros} evolucion={puntos} />
      </div>
      <div className="flex min-w-0 flex-col gap-5">
        <Evolucion puntos={puntos} />
        <Reforzar prioridades={pruebasPorReforzar(simulacros, VENTANA)} ventana={VENTANA} />
      </div>
    </div>
  );
}
