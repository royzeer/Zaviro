import type { Modulo } from '@/dominio/catalogo';
import type { NombreIcono } from '@/componentes/Icono';

export interface DefinicionRuta {
  ruta: string;
  titulo: string;
  descripcion: string;
  icono: NombreIcono;
  /** La ruta se muestra si el perfil tiene activo alguno de estos módulos. */
  modulos?: Modulo[];
  grupo: 'principal' | 'nivel' | 'sistema';
}

export const RUTAS: DefinicionRuta[] = [
  {
    ruta: '/',
    titulo: 'Inicio',
    descripcion: 'Tu árbol de estudio y lo que toca hoy.',
    icono: 'inicio',
    grupo: 'principal',
  },
  {
    ruta: '/materias',
    titulo: 'Materias',
    descripcion: 'Materias, temas, cortes o períodos y créditos.',
    icono: 'materias',
    modulos: ['materias'],
    grupo: 'principal',
  },
  {
    ruta: '/apuntes',
    titulo: 'Apuntes',
    descripcion: 'Tus apuntes en Markdown, organizados por tema.',
    icono: 'apuntes',
    modulos: ['apuntes'],
    grupo: 'principal',
  },
  {
    ruta: '/errores',
    titulo: 'Errores',
    descripcion: 'Registra un error en pocos toques y encuentra su raíz.',
    icono: 'errores',
    modulos: ['errores'],
    grupo: 'principal',
  },
  {
    ruta: '/repasar',
    titulo: 'Repasar',
    descripcion: 'Tarjetas que te tocan hoy, con repetición espaciada.',
    icono: 'repasar',
    modulos: ['repaso'],
    grupo: 'principal',
  },
  {
    ruta: '/notas',
    titulo: 'Notas y plan',
    descripcion: 'Cuánto necesitas, tu promedio y dónde rinde más tu hora.',
    icono: 'notas',
    modulos: ['notas', 'plan'],
    grupo: 'principal',
  },
  {
    ruta: '/ejemplos',
    titulo: 'Ejemplos resueltos',
    descripcion: 'Soluciones paso a paso con cada valor explicado.',
    icono: 'ejemplos',
    modulos: ['ejemplos'],
    grupo: 'principal',
  },
  {
    ruta: '/saber11',
    titulo: 'Saber 11',
    descripcion: 'Simulacros por prueba y tu puntaje global.',
    icono: 'saber',
    modulos: ['saber11'],
    grupo: 'nivel',
  },
  {
    ruta: '/saber-pro',
    titulo: 'Saber Pro / TyT',
    descripcion: 'Preparación por módulos genéricos y específicos.',
    icono: 'saber',
    modulos: ['saberPro'],
    grupo: 'nivel',
  },
  {
    ruta: '/trabajo-grado',
    titulo: 'Trabajo de grado',
    descripcion: 'Hitos, fechas y avances de tu trabajo de grado.',
    icono: 'hitos',
    modulos: ['trabajoGrado'],
    grupo: 'nivel',
  },
  {
    ruta: '/lecturas',
    titulo: 'Lecturas',
    descripcion: 'Lecturas académicas, notas y banco de citas.',
    icono: 'lecturas',
    modulos: ['lecturas'],
    grupo: 'nivel',
  },
  {
    ruta: '/bitacora',
    titulo: 'Bitácora',
    descripcion: 'Avances de investigación, día a día.',
    icono: 'bitacora',
    modulos: ['bitacora'],
    grupo: 'nivel',
  },
  {
    ruta: '/ajustes',
    titulo: 'Ajustes',
    descripcion: 'Cuenta, tema, respaldo y datos de ejemplo.',
    icono: 'ajustes',
    grupo: 'sistema',
  },
];

export function buscarRuta(ruta: string): DefinicionRuta | undefined {
  return RUTAS.find((r) => r.ruta === ruta);
}

/**
 * Resuelve una ruta con parámetro, por ejemplo /materias/abc devuelve
 * la definición de /materias y el parámetro "abc".
 */
export function resolverRuta(
  ruta: string,
): { def: DefinicionRuta; parametro?: string } | undefined {
  const exacta = buscarRuta(ruta);
  if (exacta) return { def: exacta };
  const [, base, parametro] = /^(\/[^/]+)\/([^/]+)$/.exec(ruta) ?? [];
  const def = base ? buscarRuta(base) : undefined;
  return def && parametro ? { def, parametro: decodeURIComponent(parametro) } : undefined;
}

/** Rutas visibles para los módulos activos de un perfil. */
export function rutasVisibles(modulosActivos: Modulo[] | undefined): DefinicionRuta[] {
  return RUTAS.filter(
    (r) => !r.modulos || !modulosActivos || r.modulos.some((m) => modulosActivos.includes(m)),
  );
}
