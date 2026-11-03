import { useConsulta } from '@/db/useConsulta';
import { usePerfil } from '@/estado/usePerfil';
import { Calculadora } from './notas/Calculadora';
import { cargarPlan } from './notas/datosPlan';
import { PlanEstudio } from './notas/PlanEstudio';
import { Promedio } from './notas/Promedio';
import { Rendimiento } from './notas/Rendimiento';

export function NotasPlan() {
  const { perfil } = usePerfil();
  const datos = useConsulta(() => (perfil ? cargarPlan(perfil) : null), [perfil]);
  if (!perfil || !datos) return null;
  const notas = perfil.modulosActivos.includes('notas');
  const plan = perfil.modulosActivos.includes('plan');
  return (
    <div className="grid items-start gap-5 xl:grid-cols-2">
      <div className="flex flex-col gap-5">
        {notas && <Calculadora perfil={perfil} materias={datos.materias} />}
        {notas && <Promedio perfil={perfil} materias={datos.materias} />}
        {!notas && (
          <Rendimiento
            rendimiento={datos.rendimiento}
            creditos={perfil.reglas.creditos.activados}
          />
        )}
      </div>
      <div className="flex flex-col gap-5">
        {notas && (
          <Rendimiento
            rendimiento={datos.rendimiento}
            creditos={perfil.reglas.creditos.activados}
          />
        )}
        {plan && <PlanEstudio perfil={perfil} datos={datos} />}
      </div>
    </div>
  );
}
