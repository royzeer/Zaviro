import { useSyncExternalStore } from 'react';

/**
 * Enrutador mínimo basado en el hash de la URL (#/materias).
 * Funciona sin servidor y sin conexión, que es justo lo que necesita una PWA local-first.
 */

function leerRuta(): string {
  const hash = window.location.hash.replace(/^#/, '');
  return hash.startsWith('/') ? hash : '/';
}

function suscribir(aviso: () => void) {
  window.addEventListener('hashchange', aviso);
  return () => window.removeEventListener('hashchange', aviso);
}

export function useRutaActual(): string {
  return useSyncExternalStore(suscribir, leerRuta, () => '/');
}

export function navegar(ruta: string) {
  window.location.hash = ruta;
}

export function hrefDe(ruta: string): string {
  return `#${ruta}`;
}
