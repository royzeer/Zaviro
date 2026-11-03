// Formato único de respuesta para toda la API: { ok, data, mensaje }
import type { Response } from 'express';

export type ErroresPorCampo = Record<string, string>;

export class AppError extends Error {
  constructor(
    mensaje: string,
    public estado = 400,
    public detalles?: ErroresPorCampo,
  ) {
    super(mensaje);
  }
}

export function exito(res: Response, data: unknown = null, mensaje = 'OK', estado = 200) {
  return res.status(estado).json({ ok: true, data, mensaje });
}
