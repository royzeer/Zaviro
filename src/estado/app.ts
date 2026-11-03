import { create } from 'zustand';

export type PreferenciaTema = 'claro' | 'oscuro' | 'sistema';
const CLAVE_TEMA = 'zaviro-tema';

function leerPreferencia(): PreferenciaTema {
  try {
    const v = localStorage.getItem(CLAVE_TEMA);
    if (v === 'claro' || v === 'oscuro') return v;
  } catch {
    /* almacenamiento no disponible: se usa el del sistema */
  }
  return 'sistema';
}

export function temaEfectivo(pref: PreferenciaTema): 'claro' | 'oscuro' {
  if (pref !== 'sistema') return pref;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro';
}

export function aplicarTema(pref: PreferenciaTema) {
  const tema = temaEfectivo(pref);
  document.documentElement.dataset.tema = tema;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', tema === 'oscuro' ? '#1b1815' : '#e9e5dd');
}

interface EstadoApp {
  tema: PreferenciaTema;
  menuAbierto: boolean;
  setTema: (t: PreferenciaTema) => void;
  setMenuAbierto: (v: boolean) => void;
}

export const useApp = create<EstadoApp>((set) => ({
  tema: leerPreferencia(),
  menuAbierto: false,
  setTema: (tema) => {
    try {
      if (tema === 'sistema') localStorage.removeItem(CLAVE_TEMA);
      else localStorage.setItem(CLAVE_TEMA, tema);
    } catch {
      /* sin almacenamiento: el cambio dura solo esta sesión */
    }
    aplicarTema(tema);
    set({ tema });
  },
  setMenuAbierto: (menuAbierto) => set({ menuAbierto }),
}));
