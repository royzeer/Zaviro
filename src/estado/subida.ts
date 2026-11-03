// Documento elegido para subir. El diálogo vive una sola vez en la app, así no se cierra
// cuando la pantalla que tenía el botón cambia (por ejemplo, al aparecer los temas nuevos).
import { create } from 'zustand';

interface EstadoSubida {
  archivo: File | null;
  /** Abre el selector de archivos del sistema. */
  abrirSelector: () => void;
  elegir: (archivo: File | null) => void;
  registrarSelector: (f: () => void) => void;
}

export const useSubida = create<EstadoSubida>((set) => ({
  archivo: null,
  abrirSelector: () => {},
  elegir: (archivo) => set({ archivo }),
  registrarSelector: (abrirSelector) => set({ abrirSelector }),
}));
