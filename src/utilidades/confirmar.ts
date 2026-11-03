/** Confirmación simple para acciones que borran datos. */
export function confirmar(mensaje: string): boolean {
  return window.confirm(mensaje);
}
