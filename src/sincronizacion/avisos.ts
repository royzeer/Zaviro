// Aviso de que algo cambió en este dispositivo, para programar una sincronización.
const oyentes = new Set<() => void>();

export function avisarCambioLocal() {
  oyentes.forEach((f) => f());
}

export function alCambiarLocal(f: () => void): () => void {
  oyentes.add(f);
  return () => oyentes.delete(f);
}
