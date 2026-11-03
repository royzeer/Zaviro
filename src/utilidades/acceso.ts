export type Modo = 'login' | 'registro';
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Revisa el formulario antes de enviarlo. Devuelve los errores por campo. */
export function revisarAcceso(
  modo: Modo,
  d: { nombre: string; correo: string; contrasena: string },
) {
  const errores: Record<string, string> = {};
  if (modo === 'registro' && d.nombre.trim().length < 2) errores.nombre = 'Escribe tu nombre';
  if (!CORREO.test(d.correo.trim())) errores.correo = 'Escribe un correo válido';
  if (modo === 'registro' && d.contrasena.length < 8) errores.contrasena = 'Mínimo 8 caracteres';
  if (modo === 'login' && !d.contrasena) errores.contrasena = 'Escribe tu contraseña';
  return errores;
}
