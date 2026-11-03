import type { Modulo } from '@/dominio/catalogo';
import type { NombreIcono } from '@/componentes/Icono';

export interface DefinicionRuta {
  ruta: string;
  titulo: string;
  descripcion: string;
  icono: NombreIcono;
  /** Módulo que debe estar activo en el perfil para mostrar la ruta. */
  modulo?: Modulo;
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
    modulo: 'materias',
    grupo: 'principal',
  },
  {
    ruta: '/apuntes',
    titulo: 'Apuntes',
    descripcion: 'Tus apuntes en Markdown, organizados por tema.',
    icono: 'apuntes',
    modulo: 'apuntes',
    grupo: 'principal',
  },
  {
    ruta: '/errores',
    titulo: 'Errores',
    descripcion: 'Registra un error en pocos toques y encuentra su raíz.',
    icono: 'errores',
    modulo: 'errores',
    grupo: 'principal',
  },
  {
    ruta: '/repasar',
    titulo: 'Repasar',
    descripcion: 'Tarjetas que te tocan hoy, con repetición espaciada.',
    icono: 'repasar',
    modulo: 'repaso',
    grupo: 'principal',
  },
  {
    ruta: '/notas',
    titulo: 'Notas y plan',
    descripcion: 'Cuánto necesitas, tu promedio y dónde rinde más tu hora.',
    icono: 'notas',
    modulo: 'notas',
    grupo: 'principal',
  },
  {
    ruta: '/ejemplos',
    titulo: 'Ejemplos resueltos',
    descripcion: 'Soluciones paso a paso con cada valor explicado.',
    icono: 'ejemplos',
    modulo: 'ejemplos',
    grupo: 'principal',
  },
  {
    ruta: '/saber11',
    titulo: 'Saber 11',
    descripcion: 'Simulacros por prueba y tu puntaje global.',
    icono: 'saber',
    modulo: 'saber11',
    grupo: 'nivel',
  },
  {
    ruta: '/saber-pro',
    titulo: 'Saber Pro / TyT',
    descripcion: 'Preparación por módulos genéricos y específicos.',
    icono: 'saber',
    modulo: 'saberPro',
    grupo: 'nivel',
  },
  {
    ruta: '/trabajo-grado',
    titulo: 'Trabajo de grado',
    descripcion: 'Hitos, fechas y avances de tu trabajo de grado.',
    icono: 'hitos',
    modulo: 'trabajoGrado',
    grupo: 'nivel',
  },
  {
    ruta: '/lecturas',
    titulo: 'Lecturas',
    descripcion: 'Lecturas académicas, notas y banco de citas.',
    icono: 'lecturas',
    modulo: 'lecturas',
    grupo: 'nivel',
  },
  {
    ruta: '/ajustes',
    titulo: 'Ajustes',
    descripcion: 'Tema, perfiles, respaldo y datos de ejemplo.',
    icono: 'ajustes',
    grupo: 'sistema',
  },
];

export function buscarRuta(ruta: string): DefinicionRuta | undefined {
  return RUTAS.find((r) => r.ruta === ruta);
}
