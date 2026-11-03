// Manejo central de errores: toda respuesta de error sale con el mismo formato.
import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { AppError } from '../utils/respuesta';

export function rutaNoEncontrada(req: Request, _res: Response, next: NextFunction) {
  next(new AppError(`Ruta no encontrada: ${req.method} ${req.originalUrl}`, 404));
}

export function manejarErrores(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  const tipo = (error as { type?: string }).type;
  if (tipo === 'entity.parse.failed') {
    return res
      .status(400)
      .json({ ok: false, data: null, mensaje: 'El cuerpo de la petición no es JSON válido' });
  }
  if (tipo === 'entity.too.large') {
    return res
      .status(413)
      .json({ ok: false, data: null, mensaje: 'La petición es demasiado grande' });
  }
  if (error instanceof AppError) {
    return res.status(error.estado).json({
      ok: false,
      data: error.detalles ? { errores: error.detalles } : null,
      mensaje: error.message,
    });
  }
  // Errores inesperados: se registran, pero no se muestran detalles internos.
  if (env.entorno !== 'test') console.error(error);
  return res.status(500).json({ ok: false, data: null, mensaje: 'Error interno del servidor' });
}
