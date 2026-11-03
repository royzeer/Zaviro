import type { Materia, PerfilAcademico } from '@/db/esquemas';
import { COLORES_MATERIA, cortesIniciales } from '@/db/operaciones';
import { nuevoId } from '@/db/repositorio';
import type { TipoMateria } from '@/dominio/catalogo';

const TIPO_POR_AREA: Record<PerfilAcademico['area'], TipoMateria> = {
  ingenieria: 'cuantitativa',
  naturales: 'laboratorio',
  programacion: 'programacion',
  salud: 'teorica',
  sociales: 'teorica',
  arte: 'teorica',
};

export function materiaNueva(perfil: PerfilAcademico, cantidad: number): Materia {
  return {
    id: nuevoId(),
    perfilId: perfil.id,
    nombre: '',
    color: COLORES_MATERIA[cantidad % COLORES_MATERIA.length]!,
    tipo: TIPO_POR_AREA[perfil.area],
    cortes: cortesIniciales(perfil.reglas),
    estado: 'cursando',
    ...(perfil.reglas.creditos.activados ? { creditos: 3 } : {}),
  };
}
