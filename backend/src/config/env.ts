// Carga y valida las variables de entorno en un solo lugar.
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const entorno = process.env.NODE_ENV || 'development';

function secretoJwt(): string {
  const secreto = process.env.JWT_SECRET;
  if (secreto) return secreto;
  if (entorno === 'production') throw new Error('Falta la variable JWT_SECRET');
  return 'secreto-solo-para-desarrollo';
}

export const env = {
  puerto: Number(process.env.PORT) || 4000,
  entorno,
  frontendUrl: (process.env.FRONTEND_URL || 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map((u) => u.trim().replace(/\/$/, ''))
    .filter(Boolean),
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'zaviro',
    // Bases de datos en la nube (como Aiven) exigen conexión cifrada (SSL).
    ssl: process.env.DB_SSL === 'true',
    certificadoCa: (process.env.DB_CA_CERT || '').replace(/\\n/g, '\n'),
  },
  /** Inteligencia artificial (Claude) para organizar los apuntes. Sin clave, la app usa su modo propio. */
  ia: {
    clave: (process.env.ANTHROPIC_API_KEY || '').trim(),
    modelo: (process.env.ANTHROPIC_MODEL || 'claude-opus-5-5').trim(),
    /** Documentos que cada usuario puede analizar por hora (controla el gasto). */
    limitePorHora: Number(process.env.IA_LIMITE_POR_HORA) || 15,
  },
  jwt: {
    secreto: secretoJwt(),
    expira: process.env.JWT_EXPIRES_IN || '30d',
  },
};
