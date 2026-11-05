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

/** Explica por qué no se llegó al servidor, con la pista más probable. */
export function mensajeSinConexion(
  api = URL_API,
  paginaLocal = typeof location !== 'undefined' && /^(localhost|127\.)/.test(location.hostname),
): string {
  if (/\/\/(localhost|127\.)/.test(api) && !paginaLocal) {
    return 'La app no sabe dónde está el servidor: falta VITE_API_URL en Vercel (y volver a desplegar).';
  }
  return 'No hay conexión con el servidor. Revisa tu internet; si el servidor estaba dormido, espera un minuto y vuelve a intentar.';
}

/** Se llama cuando la API responde 401 a una petición con token. */
let alExpirar: () => void = () => {};
export function alExpirarSesion(f: () => void) {
  alExpirar = f;
}

async function peticion<T>(
  metodo: string,
  ruta: string,
  cuerpo?: unknown,
  espera = ESPERA_MAXIMA_MS,
): Promise<T> {
  const token = obtenerToken();
  const control = new AbortController();
  const reloj = setTimeout(() => control.abort(), espera);
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
    throw new ErrorApi(mensajeSinConexion(), 0);
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
  /** `espera` en milisegundos, para peticiones largas como el análisis con IA. */
  post: <T>(ruta: string, cuerpo?: unknown, espera?: number) =>
    peticion<T>('POST', ruta, cuerpo ?? {}, espera),
  put: <T>(ruta: string, cuerpo?: unknown) => peticion<T>('PUT', ruta, cuerpo ?? {}),
  delete: <T>(ruta: string, cuerpo?: unknown) => peticion<T>('DELETE', ruta, cuerpo ?? {}),
};
