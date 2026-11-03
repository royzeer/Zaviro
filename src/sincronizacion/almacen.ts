// Lectura y escritura segura en localStorage: si el navegador lo bloquea, se usa memoria.
const memoria = new Map<string, string>();

function local(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function leer(clave: string): string | null {
  try {
    const s = local();
    if (s) return s.getItem(clave);
  } catch {
    /* se usa la memoria */
  }
  return memoria.get(clave) ?? null;
}

export function escribir(clave: string, valor: string | null) {
  if (valor === null) memoria.delete(clave);
  else memoria.set(clave, valor);
  try {
    const s = local();
    if (!s) return;
    if (valor === null) s.removeItem(clave);
    else s.setItem(clave, valor);
  } catch {
    /* sin almacenamiento: dura solo mientras la página esté abierta */
  }
}

export function leerJson<T>(clave: string): T | null {
  const t = leer(clave);
  if (t === null) return null;
  try {
    return JSON.parse(t) as T;
  } catch {
    return null;
  }
}

export function escribirJson(clave: string, valor: unknown) {
  escribir(clave, valor === null ? null : JSON.stringify(valor));
}
