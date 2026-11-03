/** Convierte texto con coma o punto decimal a número. Devuelve null si no es válido. */
export function leerNumero(texto: string): number | null {
  const limpio = texto.trim().replace(',', '.');
  if (limpio === '' || !/^-?\d*\.?\d*$/.test(limpio) || limpio === '-' || limpio === '.')
    return null;
  const n = Number(limpio);
  return Number.isFinite(n) ? n : null;
}
