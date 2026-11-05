import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env';
import { authCtrl, iaCtrl, sincronizacionCtrl } from '../controllers';
import { requiereAuth, usuarioDe } from '../middlewares/auth';

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

// La IA cuesta por uso: cada cuenta tiene un límite de documentos por hora.
const limiteIa = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: env.ia.limitePorHora,
  keyGenerator: (req) => `usuario-${usuarioDe(req)}`,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    ok: false,
    data: null,
    mensaje: 'Ya analizaste muchos documentos esta hora. Intenta más tarde.',
  },
});

rutas.get('/ia/estado', iaCtrl.estado);
rutas.post('/ia/plan', limiteIa, iaCtrl.organizar);
