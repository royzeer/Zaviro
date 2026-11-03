import { NOMBRE_PRUEBA } from '@/config/saber11';
import { db } from '@/db/db';
import type { SimulacroSaber11 } from '@/db/esquemas';
import { Icono } from '@/componentes/Icono';
import { Tarjeta } from '@/componentes/Tarjeta';
import { PRUEBAS_SABER11 } from '@/dominio/catalogo';
import type { PuntoEvolucion } from '@/dominio/saber11';
import { confirmar } from '@/utilidades/confirmar';
import { fechaCorta } from '@/utilidades/fechas';

const CORTO: Record<(typeof PRUEBAS_SABER11)[number], string> = {
  lecturaCritica: 'LC',
  matematicas: 'MA',
  socialesCiudadanas: 'SC',
  cienciasNaturales: 'CN',
  ingles: 'IN',
};

export function Historial({
  simulacros,
  evolucion,
}: {
  simulacros: SimulacroSaber11[];
  evolucion: PuntoEvolucion[];
}) {
  if (simulacros.length === 0) return null;
  const porId = new Map(simulacros.map((s) => [s.id, s]));
  return (
    <Tarjeta titulo="Simulacros" icono="calendario">
      <div className="relative overflow-x-auto">
        <table className="w-full min-w-[30rem] text-sm">
          <caption className="sr-only">
            Historial de simulacros con el puntaje de cada prueba
          </caption>
          <thead>
            <tr className="text-left text-xs text-tinta-suave">
              <th scope="col" className="py-2 font-semibold">
                Fecha
              </th>
              {PRUEBAS_SABER11.map((p) => (
                <th key={p} scope="col" className="py-2 text-right font-semibold">
                  <abbr title={NOMBRE_PRUEBA[p]} className="no-underline">
                    {CORTO[p]}
                  </abbr>
                </th>
              ))}
              <th scope="col" className="py-2 text-right font-semibold">
                Global
              </th>
              <th scope="col">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {[...evolucion].reverse().map((e) => {
              const s = porId.get(e.id)!;
              return (
                <tr key={e.id} className="border-t border-linea/60">
                  <td className="py-2">{fechaCorta(e.fecha)}</td>
                  {PRUEBAS_SABER11.map((p) => (
                    <td key={p} className="py-2 text-right tabular-nums">
                      {Math.round(s.puntajes[p])}
                    </td>
                  ))}
                  <td className="py-2 text-right font-bold tabular-nums">
                    {e.global}
                    {e.cambio !== null && e.cambio !== 0 && (
                      <span
                        className={`ml-1 text-xs ${e.cambio > 0 ? 'text-exito' : 'text-peligro'}`}
                      >
                        {e.cambio > 0 ? '+' : ''}
                        {e.cambio}
                      </span>
                    )}
                  </td>
                  <td className="py-1 text-right">
                    <button
                      type="button"
                      className="boton-fantasma p-1.5"
                      aria-label={`Borrar simulacro del ${fechaCorta(e.fecha)}`}
                      onClick={() => {
                        if (confirmar('¿Borrar este simulacro?')) void db.simulacros.delete(e.id);
                      }}
                    >
                      <Icono nombre="papelera" tamano={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Tarjeta>
  );
}
