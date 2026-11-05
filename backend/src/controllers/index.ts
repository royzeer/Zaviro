// Controladores: leen la petición, llaman al servicio y responden con el formato común.
import type { Request, Response } from 'express';
import { usuarioDe } from '../middlewares/auth';
import * as auth from '../services/auth.service';
import * as ia from '../services/ia.service';
import * as sincronizacion from '../services/sincronizacion.service';
import { exito } from '../utils/respuesta';

const cuerpo = (req: Request) => (req.body ?? {}) as Record<string, unknown>;

export const authCtrl = {
  registro: async (req: Request, res: Response) =>
    exito(res, await auth.registrar(cuerpo(req)), 'Cuenta creada', 201),
  login: async (req: Request, res: Response) =>
    exito(res, await auth.iniciarSesion(cuerpo(req)), 'Bienvenido'),
  perfil: async (req: Request, res: Response) => exito(res, await auth.perfil(usuarioDe(req))),
  cambiarNombre: async (req: Request, res: Response) =>
    exito(res, await auth.cambiarNombre(usuarioDe(req), cuerpo(req)), 'Nombre actualizado'),
  cambiarContrasena: async (req: Request, res: Response) => {
    await auth.cambiarContrasena(usuarioDe(req), cuerpo(req));
    return exito(res, null, 'Contraseña actualizada');
  },
  borrarCuenta: async (req: Request, res: Response) => {
    await auth.borrarCuenta(usuarioDe(req), cuerpo(req));
    return exito(res, null, 'Cuenta borrada');
  },
};

export const sincronizacionCtrl = {
  traer: async (req: Request, res: Response) =>
    exito(res, await sincronizacion.traer(usuarioDe(req), req.query.desde)),
  enviar: async (req: Request, res: Response) =>
    exito(res, await sincronizacion.enviar(usuarioDe(req), req.body)),
  resumen: async (req: Request, res: Response) =>
    exito(res, await sincronizacion.resumen(usuarioDe(req))),
};

export const iaCtrl = {
  estado: (_req: Request, res: Response) => exito(res, { disponible: ia.iaDisponible() }),
  organizar: async (req: Request, res: Response) =>
    exito(res, await ia.organizarApuntes(req.body), 'Plan creado con IA'),
};
