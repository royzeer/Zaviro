// Protege las rutas privadas: exige un token JWT válido en el encabezado Authorization.
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../utils/respuesta';

declare module 'express-serve-static-core' {
  interface Request {
    usuarioId?: number;
  }
}

export function requiereAuth(req: Request, _res: Response, next: NextFunction) {
  const [tipo, token] = (req.headers.authorization || '').split(' ');
  if (tipo !== 'Bearer' || !token) return next(new AppError('Debes iniciar sesión', 401));
  try {
    const datos = jwt.verify(token, env.jwt.secreto) as { id?: unknown };
    if (typeof datos.id !== 'number') throw new Error('Token sin usuario');
    req.usuarioId = datos.id;
    return next();
  } catch {
    return next(new AppError('La sesión expiró o no es válida', 401));
  }
}

/** Id del usuario de una ruta protegida (siempre existe después de requiereAuth). */
export function usuarioDe(req: Request): number {
  if (req.usuarioId === undefined) throw new AppError('Debes iniciar sesión', 401);
  return req.usuarioId;
}
