import { useState } from 'react';
import { navegar } from '@/app/enrutador';
import type { Tema } from '@/db/esquemas';
import { guardar, nuevoId } from '@/db/repositorio';
import { Campo, NumeroEntrada } from '@/componentes/Formulario';
import { Tarjeta } from '@/componentes/Tarjeta';
import { NOMBRE_AREA } from '@/dominio/catalogo';
import { normalizarValores, valoresIniciales, type Generador } from '@/dominio/ejemplos';
import { normalizar } from '@/dominio/lecturas';
import { Solucion } from './Solucion';

export function VistaGenerador({
  generador,
  temas,
}: {
  generador: Generador;
  temas: (Tema & { materia: string })[];
}) {
  const [valores, setValores] = useState<Record<string, number>>(() => valoresIniciales(generador));
  const [temaId, setTemaId] = useState('');
  const datos = normalizarValores(generador, valores);
  const s = generador.resolver(datos);
  // Sugiere el tema que más palabras comparte con el del ejemplo.
  const palabras = (t: string) =>
    normalizar(t)
      .split(/\W+/)
      .filter((w) => w.length > 4);
  const clave = new Set(palabras(`${generador.tema} ${generador.titulo}`));
  const puntaje = (t: Tema) => palabras(t.titulo).filter((w) => clave.has(w)).length;
  const sugerido = [...temas].sort((a, b) => puntaje(b) - puntaje(a))[0]?.id ?? '';
  const elegido = temas.some((t) => t.id === temaId) ? temaId : sugerido;

  async function guardarCopia() {
    if (!elegido) return;
    const id = nuevoId();
    await guardar('ejemplos', {
      id,
      temaId: elegido,
      titulo: generador.titulo,
      enunciado: s.enunciado,
      pasos: s.pasos,
      comprobacion: s.comprobacion,
      ...(s.diagrama ? { diagrama: s.diagrama } : {}),
      origen: generador.id,
    });
    navegar(`/ejemplos/${id}`);
  }

  return (
    <div className="flex flex-col gap-5">
      <Tarjeta titulo={generador.titulo} icono="ejemplos">
        <p className="mb-4 text-xs font-semibold text-tinta-suave">
          {generador.areas.map((a) => NOMBRE_AREA[a]).join(' · ')} · {generador.tema}
        </p>
        <fieldset className="mb-5 rounded-xl border border-linea/70 p-3">
          <legend className="px-1 text-xs font-semibold text-tinta-suave">
            Cambia los datos y mira cómo cambia cada paso
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {generador.parametros.map((p) => (
              <Campo key={p.clave} etiqueta={`${p.etiqueta}${p.unidad ? ` (${p.unidad})` : ''}`}>
                {(id) => (
                  <NumeroEntrada
                    id={id}
                    valor={valores[p.clave] ?? p.valor}
                    min={p.min}
                    max={p.max}
                    onCambio={(v) => v !== null && setValores((x) => ({ ...x, [p.clave]: v }))}
                  />
                )}
              </Campo>
            ))}
          </div>
          <button
            type="button"
            className="boton-fantasma mt-2 px-2 py-1 text-xs"
            onClick={() => setValores(valoresIniciales(generador))}
          >
            Volver a los datos iniciales
          </button>
        </fieldset>
        <Solucion {...s} />
      </Tarjeta>
      <Tarjeta titulo="Guardar en mis ejemplos" icono="mas">
        {temas.length === 0 ? (
          <p className="text-sm text-tinta-suave">
            Para guardarlo necesitas al menos un tema en tus materias.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <Campo
              etiqueta="Tema"
              ayuda="Se guarda con los datos que tienes ahora y lo puedes editar."
            >
              {(id, ayuda) => (
                <select
                  id={id}
                  aria-describedby={ayuda}
                  className="campo"
                  value={elegido}
                  onChange={(e) => setTemaId(e.target.value)}
                >
                  {temas.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.materia} · {t.titulo}
                    </option>
                  ))}
                </select>
              )}
            </Campo>
            <button
              type="button"
              className="boton-primario sm:mb-6"
              onClick={() => void guardarCopia()}
            >
              Guardar copia
            </button>
          </div>
        )}
      </Tarjeta>
    </div>
  );
}
