// Punto de entrada: prepara la base de datos y abre el puerto.
import { app } from './app';
import { pool } from './config/db';
import { env } from './config/env';
import { inicializarBase } from './scripts/init-db';

async function iniciar() {
  // Crea la base y las tablas si faltan (no borra nada): así no hay que correr db:init a mano.
  await inicializarBase();
  await pool.query('SELECT 1');
  app.listen(env.puerto, () => {
    console.log(`Zaviro API escuchando en http://localhost:${env.puerto}/api`);
  });
}

iniciar().catch((error: Error) => {
  console.error('No se pudo iniciar el servidor:', error.message);
  process.exit(1);
});
