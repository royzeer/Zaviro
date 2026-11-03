import { useState } from 'react';
import type { Lectura } from '@/db/esquemas';
import { EstadoVacio, Tarjeta } from '@/componentes/Tarjeta';
import { bancoDeCitas, formatoCita } from '@/dominio/lecturas';

export function BancoCitas({ lecturas }: { lecturas: Lectura[] }) {
  const [buscar, setBuscar] = useState('');
  const [copiada, setCopiada] = useState<string | null>(null);
  const citas = bancoDeCitas(lecturas, buscar);
  const total = lecturas.reduce((s, l) => s + l.citas.length, 0);

  async function copiar(clave: string, texto: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiada(clave);
    } catch {
      setCopiada(null);
    }
  }

  return (
    <Tarjeta titulo="Banco de citas" icono="apuntes">
      {total === 0 ? (
        <EstadoVacio texto="Las citas que guardes en tus lecturas se reúnen aquí, con su fuente, para buscarlas y copiarlas cuando escribas." />
      ) : (
        <>
          <label htmlFor="buscar-cita" className="sr-only">
            Buscar en las citas
          </label>
          <input
            id="buscar-cita"
            type="search"
            className="campo mb-3"
            placeholder="Buscar por texto, autor o referencia"
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
          />
          <p className="mb-2 text-xs text-tinta-suave" aria-live="polite">
            {citas.length} de {total} {total === 1 ? 'cita' : 'citas'}
          </p>
          <ul className="flex flex-col gap-2">
            {citas.map((c) => {
              const clave = `${c.lecturaId}-${c.indice}`;
              return (
                <li key={clave} className="rounded-xl bg-superficie-2/70 p-3 text-sm">
                  <p className="italic">“{c.texto}”</p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p className="text-xs text-tinta-suave">
                      {c.fuente}
                      {c.pagina ? `, p. ${c.pagina}` : ''}
                    </p>
                    <button
                      type="button"
                      className="boton-fantasma shrink-0 px-2 py-1 text-xs"
                      onClick={() => void copiar(clave, formatoCita(c))}
                    >
                      {copiada === clave ? 'Copiada' : 'Copiar'}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Tarjeta>
  );
}
