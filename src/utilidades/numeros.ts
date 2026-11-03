/** Convierte texto con coma o punto decimal a número. Devuelve null si no es válido. */
export function leerNumero(texto: string): number | null {
  const limpio = texto.trim().replace(',', '.');
  if (limpio === '' || !/^-?\d*\.?\d*$/.test(limpio) || limpio === '-' || limpio === '.')
    return null;
  const n = Number(limpio);
  return Number.isFinite(n) ? n : null;
}

/** Escribe una duración en horas como "1 h 55 min", redondeando a 5 minutos. */
export function duracion(horas: number): string {
  const total = Math.max(0, Math.round((horas * 60) / 5) * 5);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}
