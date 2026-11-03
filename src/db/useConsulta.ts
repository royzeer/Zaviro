import { liveQuery } from 'dexie';
import { useEffect, useState } from 'react';

/**
 * Suscribe un componente a una consulta de Dexie: se vuelve a ejecutar
 * cuando cambian las tablas que lee. Devuelve `undefined` mientras carga.
 */
export function useConsulta<T>(
  consulta: () => Promise<T> | T,
  deps: unknown[] = [],
): T | undefined {
  const [valor, setValor] = useState<T | undefined>(undefined);
  useEffect(() => {
    const sub = liveQuery(consulta).subscribe({
      next: setValor,
      error: (e: unknown) => console.error('Error en consulta local', e),
    });
    return () => sub.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return valor;
}
