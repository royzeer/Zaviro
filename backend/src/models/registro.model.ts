// Registros sincronizados: cada fila es un registro de la app (un apunte, una materia...)
// guardado como JSON, con la revisión en que cambió por última vez.
import type { PoolConnection } from 'mysql2/promise';
import { consultar } from '../config/db';
import type { Cambio } from '../utils/cambios';

export interface CambioGuardado extends Cambio {
  revision: number;
}

interface FilaRegistro {
  tabla: string;
  registro_id: string;
  datos: unknown;
  borrado: boolean;
  revision: number | string;
}

/** MySQL 8 entrega las columnas JSON ya convertidas; MariaDB las entrega como texto. */
function leerJson(valor: unknown): Record<string, unknown> | null {
  if (valor === null || valor === undefined) return null;
  if (typeof valor === 'string') return JSON.parse(valor) as Record<string, unknown>;
  return valor as Record<string, unknown>;
}

export async function guardarCambios(
  conexion: PoolConnection,
  usuarioId: number,
  cambios: Cambio[],
  primeraRevision: number,
) {
  if (cambios.length === 0) return;
  const marcas = cambios.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
  const valores = cambios.flatMap((c, i) => [
    usuarioId,
    c.tabla,
    c.id,
    c.datos === null ? null : JSON.stringify(c.datos),
    c.datos === null,
    primeraRevision + i,
  ]);
  await conexion.query(
    `INSERT INTO registros (usuario_id, tabla, registro_id, datos, borrado, revision)
     VALUES ${marcas}
     ON DUPLICATE KEY UPDATE datos = VALUES(datos), borrado = VALUES(borrado), revision = VALUES(revision)`,
    valores,
  );
}

/** Cambios con revisión mayor a `desde`, en orden, hasta `limite` filas. */
export async function cambiosDesde(
  usuarioId: number,
  desde: number,
  limite: number,
): Promise<CambioGuardado[]> {
  const filas = await consultar<FilaRegistro>(
    `SELECT tabla, registro_id, datos, borrado, revision FROM registros
     WHERE usuario_id = ? AND revision > ?
     ORDER BY revision
     LIMIT ${Number(limite)}`,
    [usuarioId, desde],
  );
  return filas.map((f) => ({
    tabla: f.tabla,
    id: f.registro_id,
    datos: f.borrado ? null : leerJson(f.datos),
    revision: Number(f.revision),
  }));
}

export async function contar(usuarioId: number): Promise<number> {
  const [f] = await consultar<{ n: number | string }>(
    'SELECT COUNT(*) AS n FROM registros WHERE usuario_id = ? AND borrado = FALSE',
    [usuarioId],
  );
  return Number(f?.n ?? 0);
}
