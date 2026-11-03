// Sincronización por revisiones: cada cambio que llega recibe un número de revisión
// creciente por usuario. El navegador guarda la última revisión que ya tiene y pide
// solo lo que cambió después. Si dos dispositivos editan el mismo registro, vale el último en llegar.
import { pool } from '../config/db';
import * as registros from '../models/registro.model';
import * as usuarios from '../models/usuario.model';
import { leerDesde, validarCambios } from '../utils/cambios';

export const LIMITE_POR_PAGINA = 500;

export async function enviar(usuarioId: number, cuerpo: unknown) {
  const cambios = validarCambios(cuerpo);
  if (cambios.length === 0)
    return { revision: await usuarios.revisionActual(usuarioId), guardados: 0 };

  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();
    const primera = await usuarios.reservarRevisiones(conexion, usuarioId, cambios.length);
    await registros.guardarCambios(conexion, usuarioId, cambios, primera);
    await conexion.commit();
    return { revision: primera + cambios.length - 1, guardados: cambios.length };
  } catch (error) {
    await conexion.rollback();
    throw error;
  } finally {
    conexion.release();
  }
}

export async function traer(usuarioId: number, desdeTexto: unknown) {
  const desde = leerDesde(desdeTexto);
  // Se pide una fila de más para saber si quedan páginas.
  const filas = await registros.cambiosDesde(usuarioId, desde, LIMITE_POR_PAGINA + 1);
  const hayMas = filas.length > LIMITE_POR_PAGINA;
  const cambios = hayMas ? filas.slice(0, LIMITE_POR_PAGINA) : filas;
  const revision = cambios.length ? cambios[cambios.length - 1]!.revision : desde;
  return { cambios, revision, hayMas };
}

export async function resumen(usuarioId: number) {
  return {
    registros: await registros.contar(usuarioId),
    revision: await usuarios.revisionActual(usuarioId),
  };
}
