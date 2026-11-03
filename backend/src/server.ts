// Punto de entrada: verifica la base de datos y abre el puerto.
import { app } from './app';
import { pool } from './config/db';
import { env } from './config/env';

async function iniciar() {
  await pool.query('SELECT 1');
  app.listen(env.puerto, () => {
    console.log(`Zaviro API escuchando en http://localhost:${env.puerto}/api`);
  });
}

iniciar().catch((error: Error) => {
  console.error('No se pudo iniciar el servidor:', error.message);
  process.exit(1);
});
