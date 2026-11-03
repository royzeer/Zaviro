import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env';
import { authCtrl, sincronizacionCtrl } from '../controllers';
import { requiereAuth } from '../middlewares/auth';

export const rutas = Router();

// Límite de intentos para dificultar que adivinen contraseñas.
const limiteAcceso = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.entorno === 'test' ? 1000 : 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { ok: false, data: null, mensaje: 'Demasiados intentos. Espera unos minutos.' },
});

// Sirve para despertar el servidor gratuito antes de iniciar sesión.
rutas.get('/salud', (_req, res) => {
  res.json({ ok: true, data: { estado: 'activo' }, mensaje: 'OK' });
});

rutas.post('/auth/registro', limiteAcceso, authCtrl.registro);
rutas.post('/auth/login', limiteAcceso, authCtrl.login);

rutas.use(requiereAuth);
rutas.get('/auth/perfil', authCtrl.perfil);
rutas.put('/auth/perfil', authCtrl.cambiarNombre);
rutas.put('/auth/contrasena', limiteAcceso, authCtrl.cambiarContrasena);
rutas.delete('/auth/cuenta', limiteAcceso, authCtrl.borrarCuenta);

rutas.get('/sincronizacion', sincronizacionCtrl.traer);
rutas.post('/sincronizacion', sincronizacionCtrl.enviar);
rutas.get('/sincronizacion/resumen', sincronizacionCtrl.resumen);
