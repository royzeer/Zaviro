import { useState } from 'react';
import type { TarjetaRepaso, Tema } from '@/db/esquemas';
import { crearTarjeta } from '@/db/operaciones';
import { guardar } from '@/db/repositorio';
import { Campo } from './Formulario';

type Datos = Pick<TarjetaRepaso, 'origenTipo' | 'origenId' | 'frente' | 'reverso'> & {
  temaId?: string;
};

/** Crea o edita una tarjeta de repaso. Si recibe `existente`, la edita. */
export function FormTarjeta({
  inicial,
  existente,
  temas,
  onListo,
}: {
  inicial: Datos;
  existente?: TarjetaRepaso;
  temas?: Tema[];
  onListo: () => void;
}) {
  const [d, setD] = useState<Datos>(inicial);
  const [error, setError] = useState('');

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!d.frente.trim()) return setError('Escribe la pregunta del frente.');
    if (existente) {
      const { temaId, ...resto } = {
        ...existente,
        frente: d.frente.trim(),
        reverso: d.reverso.trim(),
        temaId: d.temaId,
      };
      await guardar('tarjetas', { ...resto, ...(temaId ? { temaId } : {}) });
    } else {
      await crearTarjeta({ ...d, frente: d.frente.trim(), reverso: d.reverso.trim() });
    }
    onListo();
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      <Campo etiqueta="Frente (pregunta)" ayuda="Escríbela como te la haría el profesor.">
        {(id, idAyuda) => (
          <textarea
            id={id}
            aria-describedby={idAyuda}
            autoFocus
            className="campo min-h-24"
            value={d.frente}
            onChange={(e) => setD({ ...d, frente: e.target.value })}
          />
        )}
      </Campo>
      <Campo etiqueta="Reverso (respuesta)">
        {(id) => (
          <textarea
            id={id}
            className="campo min-h-24"
            value={d.reverso}
            onChange={(e) => setD({ ...d, reverso: e.target.value })}
          />
        )}
      </Campo>
      {temas && temas.length > 0 && (
        <Campo etiqueta="Tema" ayuda="Al repasarla se actualiza el dominio de este tema.">
          {(id, idAyuda) => (
            <select
              id={id}
              aria-describedby={idAyuda}
              className="campo"
              value={d.temaId ?? ''}
              onChange={(e) => setD({ ...d, temaId: e.target.value || undefined })}
            >
              <option value="">Sin tema</option>
              {temas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.titulo}
                </option>
              ))}
            </select>
          )}
        </Campo>
      )}
      {error && (
        <p className="text-sm text-peligro" role="alert">
          {error}
        </p>
      )}
      <div className="flex justify-end">
        <button type="submit" className="boton-primario">
          {existente ? 'Guardar' : 'Crear tarjeta'}
        </button>
      </div>
    </form>
  );
}
