// Sincroniza al abrir la app, poco después de cada cambio, al volver la conexión,
// al volver a la pestaña y cada pocos minutos para ver lo hecho en otros dispositivos.
import { useEffect } from 'react';
import { useSesion } from '@/estado/sesion';
import { alCambiarLocal } from './avisos';

const ESPERA_TRAS_CAMBIO_MS = 2000;
const CADA_MS = 3 * 60 * 1000;

export function useSincronizacionAutomatica() {
  const conSesion = useSesion((s) => s.usuario !== null);
  const sincronizar = useSesion((s) => s.sincronizarAhora);

  useEffect(() => {
    if (!conSesion) return;
    void sincronizar();
    let espera: ReturnType<typeof setTimeout> | undefined;
    const pronto = () => {
      clearTimeout(espera);
      espera = setTimeout(() => void sincronizar(), ESPERA_TRAS_CAMBIO_MS);
    };
    const alVolver = () => document.visibilityState === 'visible' && void sincronizar();
    const quitarAviso = alCambiarLocal(pronto);
    const reloj = setInterval(() => {
      if (document.visibilityState === 'visible') void sincronizar();
    }, CADA_MS);
    window.addEventListener('online', alVolver);
    document.addEventListener('visibilitychange', alVolver);
    return () => {
      clearTimeout(espera);
      clearInterval(reloj);
      quitarAviso();
      window.removeEventListener('online', alVolver);
      document.removeEventListener('visibilitychange', alVolver);
    };
  }, [conSesion, sincronizar]);
}
