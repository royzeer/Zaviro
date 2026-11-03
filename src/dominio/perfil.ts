import type { PerfilAcademico } from '@/db/esquemas';
import { NOMBRE_NIVEL } from './catalogo';

/** Nombre corto para mostrar un perfil: programa, institución o nivel. */
export function nombrePerfil(p: PerfilAcademico): string {
  return p.programa || p.institucion || NOMBRE_NIVEL[p.nivel];
}
