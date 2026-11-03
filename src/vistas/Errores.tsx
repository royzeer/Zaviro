import { useConsulta } from '@/db/useConsulta';
import { usePerfil } from '@/estado/usePerfil';
import { cargarDatosErrores } from './errores/datos';
import { Historial } from './errores/Historial';
import { RankingRaices } from './errores/RankingRaices';
import { RegistroRapido } from './errores/RegistroRapido';

export function Errores() {
  const { perfil } = usePerfil();
  const datos = useConsulta(cargarDatosErrores);
  if (!perfil || !datos) return null;
  return (
    <div className="grid items-start gap-5 xl:grid-cols-[1.25fr_1fr]">
      <div className="flex flex-col gap-5">
        <RegistroRapido perfil={perfil} datos={datos} />
        <Historial perfil={perfil} datos={datos} />
      </div>
      <RankingRaices perfil={perfil} datos={datos} />
    </div>
  );
}
