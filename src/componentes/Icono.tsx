import type { SVGProps } from 'react';

/** Íconos de línea propios (24x24), para no depender de una librería externa. */
const TRAZOS = {
  inicio: 'M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z',
  materias: 'M5 4.5h9.5a2 2 0 0 1 2 2V20H7a2 2 0 0 1-2-2zM5 18a2 2 0 0 1 2-2h9.5M19 7v13',
  apuntes: 'M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10A.5.5 0 0 1 7 20zM14 3.5V8h4M9.5 12h6M9.5 15.5h6',
  errores: 'M12 3.5 21 19.5H3zM12 10v4M12 16.8v.2',
  repasar:
    'M4.5 12a7.5 7.5 0 0 1 12.8-5.3L19.5 9M19.5 4.5V9H15M19.5 12a7.5 7.5 0 0 1-12.8 5.3L4.5 15M4.5 19.5V15H9',
  notas: 'M4.5 19.5h15M7 16V11M12 16V7M17 16v-6',
  ejemplos: 'M4 6.5h10M4 11.5h7M4 16.5h5M15 13l2.5 2.5L21 11',
  saber: 'M3 8.5 12 4.5l9 4-9 4zM7 10.5V15c0 1.4 2.2 3 5 3s5-1.6 5-3v-4.5M21 8.5V14',
  hitos: 'M6 20.5V4M6 4.5h11l-2.5 3.5L17 11.5H6',
  lecturas:
    'M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5zM12 6.5v13',
  ajustes:
    'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM19 12l1.8-1.3-1.8-3.2-2.1.6-1.6-1-.5-2.1h-3.6l-.5 2.1-1.6 1-2.1-.6L3.2 10.7 5 12l-1.8 1.3 1.8 3.2 2.1-.6 1.6 1 .5 2.1h3.6l.5-2.1 1.6-1 2.1.6 1.8-3.2z',
  sol: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4',
  luna: 'M19.5 14.5A7.5 7.5 0 0 1 9.5 4.5a7.5 7.5 0 1 0 10 10z',
  menu: 'M4 7h16M4 12h16M4 17h16',
  cerrar: 'M6 6l12 12M18 6 6 18',
  calendario: 'M5 6h14v14H5zM5 10h14M9 3.5V7M15 3.5V7',
  raiz: 'M12 3.5v8M12 11.5c-2 2-5 2.5-7 6M12 11.5c2 2 5 2.5 7 6M12 11.5v9',
  mas: 'M12 5v14M5 12h14',
  flecha: 'M9 6l6 6-6 6',
  perfil: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20.5c1-3.5 4-5.5 7.5-5.5s6.5 2 7.5 5.5',
  bombilla:
    'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z',
  papelera: 'M4.5 7h15M10 11v6M14 11v6M6.5 7l1 13h9l1-13M9.5 7V4h5v3',
} as const;

export type NombreIcono = keyof typeof TRAZOS;

interface Props extends SVGProps<SVGSVGElement> {
  nombre: NombreIcono;
  tamano?: number;
}

export function Icono({ nombre, tamano = 20, ...resto }: Props) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...resto}
    >
      <path d={TRAZOS[nombre]} />
    </svg>
  );
}
