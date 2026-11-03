import { db } from '@/db/db';
import { perfilActivo } from '@/db/operaciones';
import { useConsulta } from '@/db/useConsulta';
import { vocabulario } from '@/dominio/niveles';

/** Perfil académico activo y su vocabulario. `cargando` es true hasta leer la base local. */
export function usePerfil() {
  const datos = useConsulta(async () => ({
    perfil: await perfilActivo(),
    perfiles: await db.perfiles.toArray(),
  }));
  const perfil = datos?.perfil;
  return {
    cargando: datos === undefined,
    perfil,
    perfiles: datos?.perfiles ?? [],
    vocab: perfil ? vocabulario(perfil.nivel) : vocabulario('profesional'),
  };
}
