import type { PoolConnection } from 'mysql2/promise';
import { consultar, pool } from '../config/db';

export interface UsuarioPublico {
  id: number;
  nombre: string;
  correo: string;
  creadoEn: string;
}

interface FilaUsuario {
  id: number;
  nombre: string;
  correo: string;
  contrasena_hash: string;
  creado_en: Date;
}

function publico(f: FilaUsuario): UsuarioPublico {
  return { id: f.id, nombre: f.nombre, correo: f.correo, creadoEn: f.creado_en.toISOString() };
}

export async function buscarPorCorreo(correo: string) {
  const [f] = await consultar<FilaUsuario>('SELECT * FROM usuarios WHERE correo = ?', [correo]);
  return f ?? null;
}

export async function hashDe(id: number): Promise<string | null> {
  const [f] = await consultar<FilaUsuario>('SELECT contrasena_hash FROM usuarios WHERE id = ?', [
    id,
  ]);
  return f?.contrasena_hash ?? null;
}

export async function buscarPorId(id: number): Promise<UsuarioPublico | null> {
  const [f] = await consultar<FilaUsuario>(
    'SELECT id, nombre, correo, creado_en FROM usuarios WHERE id = ?',
    [id],
  );
  return f ? publico(f) : null;
}

export async function crear(datos: { nombre: string; correo: string; contrasenaHash: string }) {
  const [r] = await pool.execute(
    'INSERT INTO usuarios (nombre, correo, contrasena_hash) VALUES (?, ?, ?)',
    [datos.nombre, datos.correo, datos.contrasenaHash],
  );
  return (r as { insertId: number }).insertId;
}

export async function cambiarNombre(id: number, nombre: string) {
  await consultar('UPDATE usuarios SET nombre = ? WHERE id = ?', [nombre, id]);
}

export async function cambiarContrasena(id: number, contrasenaHash: string) {
  await consultar('UPDATE usuarios SET contrasena_hash = ? WHERE id = ?', [contrasenaHash, id]);
}

export async function borrar(id: number) {
  // Los registros sincronizados se borran en cascada (ON DELETE CASCADE).
  await consultar('DELETE FROM usuarios WHERE id = ?', [id]);
}

/**
 * Reserva `cantidad` números de revisión para el usuario y devuelve el primero.
 * Bloquea la fila del usuario hasta que termine la transacción, así dos envíos
 * al mismo tiempo nunca reciben las mismas revisiones.
 */
export async function reservarRevisiones(conexion: PoolConnection, id: number, cantidad: number) {
  await conexion.execute('UPDATE usuarios SET revision = revision + ? WHERE id = ?', [
    cantidad,
    id,
  ]);
  const [filas] = await conexion.execute('SELECT revision FROM usuarios WHERE id = ?', [id]);
  const final = Number((filas as { revision: number | string }[])[0]?.revision ?? 0);
  return final - cantidad + 1;
}

export async function revisionActual(id: number): Promise<number> {
  const [f] = await consultar<{ revision: number | string }>(
    'SELECT revision FROM usuarios WHERE id = ?',
    [id],
  );
  return Number(f?.revision ?? 0);
}
