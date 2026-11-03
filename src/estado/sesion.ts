// Sesión del usuario y estado de la sincronización con su cuenta.
import { create } from 'zustand';
import { db } from '@/db/db';
import { escribir, escribirJson, leer, leerJson } from '@/sincronizacion/almacen';
import {
  alExpirarSesion,
  api,
  ErrorApi,
  guardarToken,
  obtenerToken,
} from '@/sincronizacion/cliente';
import {
  borrarDatosLocales,
  guardarRevisionLocal,
  hayDatosLocales,
  marcarTodoPendiente,
  revisionLocal,
  sincronizar,
  type ApiSincronizacion,
} from '@/sincronizacion/motor';
import type { EstadoSincronizacion } from '@/sincronizacion/texto';
import {
  alCambiarPendientes,
  contarPendientes,
  vaciarPendientes,
} from '@/sincronizacion/pendientes';

export interface Usuario {
  id: number;
  nombre: string;
  correo: string;
  creadoEn: string;
}

const CLAVE_USUARIO = 'zaviro-usuario';
/** Id del usuario al que pertenecen los datos guardados en este navegador. */
const CLAVE_DUENO = 'zaviro-dueno';

const apiSincronizacion: ApiSincronizacion = {
  enviar: (cambios) => api.post('/sincronizacion', { cambios }),
  traer: (desde) => api.get(`/sincronizacion?desde=${desde}`),
};

export type PlanEntrada = 'continuar' | 'borrarLocal' | 'adoptarLocal';

/**
 * Qué hacer con los datos de este navegador al entrar:
 * - son del mismo usuario: se siguen usando;
 * - son de otra cuenta: se borran de este navegador (siguen en la cuenta de esa persona);
 * - no son de nadie (se crearon antes de tener cuenta): se suben a la cuenta que entra.
 */
export function planDeEntrada(
  dueno: number | null,
  usuarioId: number,
  hayDatos: boolean,
): PlanEntrada {
  if (dueno === usuarioId) return 'continuar';
  if (dueno !== null) return 'borrarLocal';
  return hayDatos ? 'adoptarLocal' : 'continuar';
}

function leerDueno(): number | null {
  const t = leer(CLAVE_DUENO);
  return t === null ? null : Number(t);
}

interface EstadoSesion {
  usuario: Usuario | null;
  /** Primera descarga de datos después de entrar: se muestra una espera en lugar de la bienvenida. */
  preparando: boolean;
  sincronizacion: {
    estado: EstadoSincronizacion;
    ultima: string | null;
    mensaje: string | null;
    pendientes: number;
  };
  entrar: (modo: 'login' | 'registro', datos: Record<string, string>) => Promise<void>;
  sincronizarAhora: () => Promise<void>;
  actualizarUsuario: (u: Usuario) => void;
  /** Cierra la sesión. Si quedan cambios sin subir y no se fuerza, no cierra y devuelve cuántos son. */
  cerrarSesion: (forzar?: boolean) => Promise<number>;
  borrarCuenta: (contrasena: string) => Promise<void>;
}

let enCurso: Promise<void> | null = null;
let repetir = false;

async function limpiarDispositivo() {
  await borrarDatosLocales(db);
  vaciarPendientes();
  guardarRevisionLocal(null);
  escribir(CLAVE_DUENO, null);
  escribirJson(CLAVE_USUARIO, null);
  guardarToken(null);
}

export const useSesion = create<EstadoSesion>((set, get) => ({
  usuario: obtenerToken() ? leerJson<Usuario>(CLAVE_USUARIO) : null,
  preparando: false,
  sincronizacion: {
    estado: 'inactivo',
    ultima: null,
    mensaje: null,
    pendientes: contarPendientes(),
  },

  async entrar(modo, datos) {
    const ruta = modo === 'registro' ? '/auth/registro' : '/auth/login';
    const { usuario, token } = await api.post<{ usuario: Usuario; token: string }>(ruta, datos);
    const plan = planDeEntrada(leerDueno(), usuario.id, await hayDatosLocales(db));
    if (plan === 'borrarLocal') {
      await borrarDatosLocales(db);
      vaciarPendientes();
      guardarRevisionLocal(null);
    } else if (plan === 'adoptarLocal') {
      await marcarTodoPendiente(db);
      guardarRevisionLocal(null);
    }
    escribir(CLAVE_DUENO, String(usuario.id));
    escribirJson(CLAVE_USUARIO, usuario);
    guardarToken(token);
    set({ usuario, preparando: revisionLocal() === null && plan !== 'adoptarLocal' });
    await get().sincronizarAhora();
  },

  async sincronizarAhora() {
    if (!get().usuario) return;
    if (enCurso) {
      repetir = true;
      return enCurso;
    }
    const cambiar = (p: Partial<EstadoSesion['sincronizacion']>) =>
      set((s) => ({ sincronizacion: { ...s.sincronizacion, ...p } }));
    enCurso = (async () => {
      do {
        repetir = false;
        cambiar({ estado: 'sincronizando', mensaje: null });
        try {
          await sincronizar(db, apiSincronizacion);
          cambiar({ estado: 'inactivo', ultima: new Date().toISOString() });
        } catch (e) {
          const sinRed = e instanceof ErrorApi && e.sinConexion;
          cambiar({
            estado: sinRed ? 'sinConexion' : 'error',
            mensaje: e instanceof Error ? e.message : 'No se pudo sincronizar',
          });
          break;
        }
      } while (repetir && get().usuario);
    })().finally(() => {
      enCurso = null;
      set({ preparando: false });
    });
    return enCurso;
  },

  actualizarUsuario(usuario) {
    escribirJson(CLAVE_USUARIO, usuario);
    set({ usuario });
  },

  async cerrarSesion(forzar = false) {
    await get()
      .sincronizarAhora()
      .catch(() => {});
    const pendientes = contarPendientes();
    if (pendientes > 0 && !forzar) return pendientes;
    await limpiarDispositivo();
    set({ usuario: null, preparando: false });
    return 0;
  },

  async borrarCuenta(contrasena) {
    await api.delete('/auth/cuenta', { contrasena });
    await limpiarDispositivo();
    set({ usuario: null, preparando: false });
  },
}));

// Si el servidor dice que la sesión expiró, se pide entrar otra vez.
// Los datos se quedan en el navegador y se suben al volver a entrar con la misma cuenta.
alExpirarSesion(() => {
  escribirJson(CLAVE_USUARIO, null);
  useSesion.setState({ usuario: null });
});

alCambiarPendientes(() =>
  useSesion.setState((s) => ({
    sincronizacion: { ...s.sincronizacion, pendientes: contarPendientes() },
  })),
);
