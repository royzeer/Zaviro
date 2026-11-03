import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import * as usuarios from '../models/usuario.model';
import { AppError, type ErroresPorCampo } from '../utils/respuesta';
import {
  CORREO_REGEX,
  contrasena,
  errorContrasenaNueva,
  errorNombre,
  lanzarSiHayErrores,
  texto,
} from '../utils/validar';

const RONDAS_BCRYPT = 10;

export function firmarToken(usuarioId: number): string {
  return jwt.sign({ id: usuarioId }, env.jwt.secreto, {
    expiresIn: env.jwt.expira as SignOptions['expiresIn'],
  });
}

function sesion(usuario: usuarios.UsuarioPublico) {
  return { usuario, token: firmarToken(usuario.id) };
}

export async function registrar(datos: Record<string, unknown>) {
  const nombre = texto(datos.nombre);
  const correo = texto(datos.correo).toLowerCase();
  const clave = contrasena(datos.contrasena);

  const errores: ErroresPorCampo = {};
  const eNombre = errorNombre(nombre);
  if (eNombre) errores.nombre = eNombre;
  if (!CORREO_REGEX.test(correo) || correo.length > 120)
    errores.correo = 'Escribe un correo válido';
  const eClave = errorContrasenaNueva(clave);
  if (eClave) errores.contrasena = eClave;
  lanzarSiHayErrores(errores);

  if (await usuarios.buscarPorCorreo(correo)) {
    throw new AppError('Ya existe una cuenta con ese correo', 409, {
      correo: 'Correo ya registrado',
    });
  }

  const contrasenaHash = await bcrypt.hash(clave, RONDAS_BCRYPT);
  let id: number;
  try {
    id = await usuarios.crear({ nombre, correo, contrasenaHash });
  } catch (error) {
    // Dos registros con el mismo correo al mismo tiempo: gana el primero.
    if ((error as { code?: string }).code === 'ER_DUP_ENTRY') {
      throw new AppError('Ya existe una cuenta con ese correo', 409, {
        correo: 'Correo ya registrado',
      });
    }
    throw error;
  }
  return sesion((await usuarios.buscarPorId(id))!);
}

export async function iniciarSesion(datos: Record<string, unknown>) {
  const correo = texto(datos.correo).toLowerCase();
  const clave = contrasena(datos.contrasena);
  if (!correo || !clave) throw new AppError('Escribe tu correo y tu contraseña', 422);

  const encontrado = await usuarios.buscarPorCorreo(correo);
  // Mismo mensaje en ambos casos para no revelar qué correos tienen cuenta.
  const valida = encontrado && (await bcrypt.compare(clave, encontrado.contrasena_hash));
  if (!valida) throw new AppError('Correo o contraseña incorrectos', 401);
  return sesion((await usuarios.buscarPorId(encontrado.id))!);
}

export async function perfil(usuarioId: number) {
  const usuario = await usuarios.buscarPorId(usuarioId);
  if (!usuario) throw new AppError('La cuenta ya no existe', 401);
  return usuario;
}

export async function cambiarNombre(usuarioId: number, datos: Record<string, unknown>) {
  const nombre = texto(datos.nombre);
  const error = errorNombre(nombre);
  if (error) lanzarSiHayErrores({ nombre: error });
  await usuarios.cambiarNombre(usuarioId, nombre);
  return perfil(usuarioId);
}

async function comprobarContrasena(usuarioId: number, clave: string) {
  const hash = await usuarios.hashDe(usuarioId);
  if (!hash || !(await bcrypt.compare(clave, hash))) {
    throw new AppError('La contraseña actual no es correcta', 422, {
      actual: 'Contraseña incorrecta',
    });
  }
}

export async function cambiarContrasena(usuarioId: number, datos: Record<string, unknown>) {
  const actual = contrasena(datos.actual);
  const nueva = contrasena(datos.nueva);
  const error = errorContrasenaNueva(nueva);
  if (error) lanzarSiHayErrores({ nueva: error });
  await comprobarContrasena(usuarioId, actual);
  await usuarios.cambiarContrasena(usuarioId, await bcrypt.hash(nueva, RONDAS_BCRYPT));
}

export async function borrarCuenta(usuarioId: number, datos: Record<string, unknown>) {
  await comprobarContrasena(usuarioId, contrasena(datos.contrasena));
  await usuarios.borrar(usuarioId);
}
