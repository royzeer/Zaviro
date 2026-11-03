// Configuración de la aplicación Express (sin abrir el puerto, para poder probarla).
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { manejarErrores, rutaNoEncontrada } from './middlewares/errores';
import { rutas } from './routes';

export const app = express();

// Render y otros servicios están detrás de un proxy: así el límite de intentos ve la IP real.
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: env.frontendUrl }));
// La primera sincronización puede llevar muchos apuntes a la vez.
app.use(express.json({ limit: '5mb' }));

app.use('/api', rutas);

app.use(rutaNoEncontrada);
app.use(manejarErrores);
