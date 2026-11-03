// Pool de conexiones a MySQL. Todas las consultas pasan por aquí.
import mysql, { type PoolOptions } from 'mysql2/promise';
import { env } from './env';

/** SSL para bases de datos en la nube. Con el certificado de la autoridad (CA) se valida el servidor. */
export function opcionesSsl(): PoolOptions['ssl'] {
  if (!env.db.ssl) return undefined;
  if (env.db.certificadoCa) return { ca: env.db.certificadoCa, rejectUnauthorized: true };
  return { rejectUnauthorized: false };
}

export function datosConexion() {
  const { ssl: _ssl, certificadoCa: _ca, ...conexion } = env.db;
  return { ...conexion, ssl: opcionesSsl() };
}

export const pool = mysql.createPool({
  ...datosConexion(),
  waitForConnections: true,
  connectionLimit: 10,
  // Las fechas se guardan y se leen en UTC para que no dependan del servidor.
  timezone: 'Z',
  // Las columnas BOOLEAN de MySQL son TINYINT(1): se convierten a true/false.
  typeCast(campo, siguiente) {
    if (campo.type === 'TINY' && campo.length === 1) {
      const valor = campo.string();
      return valor === null ? null : valor === '1';
    }
    return siguiente();
  },
});

/** Ejecuta una consulta parametrizada y devuelve las filas. */
export async function consultar<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const [filas] = await pool.execute(sql, params as never[]);
  return filas as T[];
}
