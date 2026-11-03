// Crea la base de datos (si no existe) y sus tablas a partir de database/schema.sql.
// No borra nada, así que también sirve para poner al día una base que ya tiene datos.
// Uso: npm run db:init   (toma la conexión del .env, por ejemplo la de Aiven)
import fs from 'node:fs';
import path from 'node:path';
import mysql from 'mysql2/promise';
import { datosConexion } from '../config/db';
import { env } from '../config/env';

export async function inicializarBase() {
  const { database, ...servidor } = datosConexion();
  const conexion = await mysql.createConnection({ ...servidor, multipleStatements: true });
  try {
    await conexion.query(
      `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
    await conexion.query(`USE \`${database}\``);
    const esquema = fs.readFileSync(
      path.join(__dirname, '..', '..', '..', 'database', 'schema.sql'),
      'utf8',
    );
    await conexion.query(esquema);
  } finally {
    await conexion.end();
  }
}

if (require.main === module) {
  inicializarBase()
    .then(() => console.log(`Base de datos "${env.db.database}" lista.`))
    .catch((error: Error) => {
      console.error('No se pudo preparar la base de datos:', error.message);
      process.exit(1);
    });
}
