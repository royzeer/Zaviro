/**
 * Fuerzas en el plano para el diagrama de cuerpo libre. Los ángulos se miden en grados desde
 * el eje x positivo, en sentido antihorario (0 = derecha, 90 = arriba, 270 = abajo).
 */

export const TIPOS_FUERZA = ['peso', 'normal', 'friccion', 'tension', 'aplicada'] as const;
export type TipoFuerza = (typeof TIPOS_FUERZA)[number];

export const NOMBRE_TIPO_FUERZA: Record<TipoFuerza, string> = {
  peso: 'Peso',
  normal: 'Normal',
  friccion: 'Fricción',
  tension: 'Tensión',
  aplicada: 'Aplicada',
};

export interface Fuerza {
  nombre: string;
  tipo: TipoFuerza;
  magnitud: number;
  angulo: number;
  unidad: string;
}

const rad = (grados: number) => (grados * Math.PI) / 180;

/** Limpia el ruido de punto flotante (por ejemplo, cos 90° = 6e-17). */
const limpio = (n: number) => (Math.abs(n) < 1e-9 ? 0 : n);

export function componentes(f: Pick<Fuerza, 'magnitud' | 'angulo'>) {
  return {
    x: limpio(f.magnitud * Math.cos(rad(f.angulo))),
    y: limpio(f.magnitud * Math.sin(rad(f.angulo))),
  };
}

export function resultante(fuerzas: Pick<Fuerza, 'magnitud' | 'angulo'>[]) {
  let x = 0;
  let y = 0;
  for (const f of fuerzas) {
    const c = componentes(f);
    x += c.x;
    y += c.y;
  }
  x = limpio(x);
  y = limpio(y);
  const magnitud = Math.hypot(x, y);
  const angulo = magnitud === 0 ? 0 : ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  return { x, y, magnitud, angulo };
}

/**
 * Está en equilibrio si la resultante es pequeña frente a la fuerza más grande
 * (tolerancia relativa, para no fallar por redondeos).
 */
export function enEquilibrio(fuerzas: Pick<Fuerza, 'magnitud' | 'angulo'>[], tolerancia = 1e-6) {
  const mayor = Math.max(0, ...fuerzas.map((f) => Math.abs(f.magnitud)));
  return resultante(fuerzas).magnitud <= tolerancia * Math.max(1, mayor);
}

/**
 * Largo de cada flecha en el dibujo: proporcional a la magnitud, pero con un mínimo para que
 * las fuerzas pequeñas se vean y un máximo para que quepan.
 */
export function largoFlecha(magnitud: number, mayor: number, minimo = 36, maximo = 120): number {
  if (mayor <= 0) return minimo;
  return minimo + (Math.min(Math.abs(magnitud), mayor) / mayor) * (maximo - minimo);
}
