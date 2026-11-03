// Cliente HTTP de la API. Agrega el token y unifica el manejo de errores.
import { escribir, leer } from './almacen';

export const URL_API: string =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ||
  'http://localhost:4000/api';
const CLAVE_TOKEN = 'zaviro-token';
/** El servidor gratuito puede tardar casi un minuto en despertar. */
const ESPERA_MAXIMA_MS = 75_000;

export const obtenerToken = () => leer(CLAVE_TOKEN);
export const guardarToken = (token: string | null) => escribir(CLAVE_TOKEN, token);

/** Error con el detalle por campo que envía la API, para mostrarlo en los formularios. */
export class ErrorApi extends Error {
  constructor(
    mensaje: string,
    public estado: number,
    public errores: Record<string, string> = {},
  ) {
    super(mensaje);
  }
  /** Sin conexión o servidor caído: se puede reintentar más tarde. */
  get sinConexion() {
    return this.estado === 0;
  }
}

/** Se llama cuando la API responde 401 a una petición con token. */
let alExpirar: () => void = () => {};
export function alExpirarSesion(f: () => void) {
  alExpirar = f;
}

async function peticion<T>(metodo: string, ruta: string, cuerpo?: unknown): Promise<T> {
  const token = obtenerToken();
  const control = new AbortController();
  const reloj = setTimeout(() => control.abort(), ESPERA_MAXIMA_MS);
  let respuesta: Response;
  try {
    respuesta = await fetch(`${URL_API}${ruta}`, {
      method: metodo,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
      signal: control.signal,
    });
  } catch {
    throw new ErrorApi('No hay conexión con el servidor', 0);
  } finally {
    clearTimeout(reloj);
  }

  const json = (await respuesta.json().catch(() => ({}))) as {
    ok?: boolean;
    data?: unknown;
    mensaje?: string;
  };
  if (!respuesta.ok || json.ok === false) {
    if (respuesta.status === 401 && token) {
      guardarToken(null);
      alExpirar();
    }
    const errores = (json.data as { errores?: Record<string, string> } | null)?.errores ?? {};
    // Render responde 502/503 mientras el servidor arranca.
    const estado = respuesta.status >= 502 && respuesta.status <= 504 ? 0 : respuesta.status;
    throw new ErrorApi(json.mensaje || 'Ocurrió un error con el servidor', estado, errores);
  }
  return json.data as T;
}

export const api = {
  get: <T>(ruta: string) => peticion<T>('GET', ruta),
  post: <T>(ruta: string, cuerpo?: unknown) => peticion<T>('POST', ruta, cuerpo ?? {}),
  put: <T>(ruta: string, cuerpo?: unknown) => peticion<T>('PUT', ruta, cuerpo ?? {}),
  delete: <T>(ruta: string, cuerpo?: unknown) => peticion<T>('DELETE', ruta, cuerpo ?? {}),
};
