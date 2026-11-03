import { useState } from 'react';
import { hrefDe, navegar } from '@/app/enrutador';
import type { Lectura, PerfilAcademico } from '@/db/esquemas';
import { guardar, nuevoId } from '@/db/repositorio';
import { EstadoVacio, Tarjeta } from '@/componentes/Tarjeta';
import { colaDeLectura, contarPorEstado, NOMBRE_ESTADO_LECTURA } from '@/dominio/lecturas';

type Filtro = 'cola' | 'leida' | 'todas';

export function ListaLecturas({
  perfil,
  lecturas,
  seleccion,
}: {
  perfil: PerfilAcademico;
  lecturas: Lectura[];
  seleccion?: string | undefined;
}) {
  const [filtro, setFiltro] = useState<Filtro>('cola');
  const [referencia, setReferencia] = useState('');
  const conteo = contarPorEstado(lecturas);
  const visibles =
    filtro === 'cola'
      ? colaDeLectura(lecturas)
      : filtro === 'leida'
        ? lecturas.filter((l) => l.estado === 'leida')
        : lecturas;

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    if (!referencia.trim()) return;
    const id = nuevoId();
    await guardar('lecturas', {
      id,
      perfilId: perfil.id,
      referencia: referencia.trim(),
      estado: 'porLeer',
      notas: '',
      citas: [],
    });
    setReferencia('');
    navegar(`/lecturas/${id}`);
  }

  const filtros: { id: Filtro; texto: string }[] = [
    { id: 'cola', texto: `Cola (${conteo.leyendo + conteo.porLeer})` },
    { id: 'leida', texto: `Leídas (${conteo.leida})` },
    { id: 'todas', texto: `Todas (${lecturas.length})` },
  ];

  return (
    <Tarjeta titulo="Lecturas" icono="lecturas">
      <form onSubmit={(e) => void agregar(e)} className="mb-4 flex flex-col gap-2">
        <label htmlFor="nueva-lectura" className="etiqueta">
          Nueva lectura
        </label>
        <textarea
          id="nueva-lectura"
          className="campo min-h-16"
          placeholder="Referencia completa, por ejemplo: Eco, U. (1977). Cómo se hace una tesis. Gedisa."
          value={referencia}
          onChange={(e) => setReferencia(e.target.value)}
        />
        <button type="submit" className="boton-primario self-end" disabled={!referencia.trim()}>
          Agregar a la cola
        </button>
      </form>
      <div
        role="tablist"
        aria-label="Filtrar lecturas"
        className="mb-3 flex gap-1 rounded-xl bg-superficie-2 p-1"
      >
        {filtros.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={filtro === f.id}
            onClick={() => setFiltro(f.id)}
            className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold ${
              filtro === f.id ? 'bg-superficie shadow-tarjeta' : 'text-tinta-suave hover:text-tinta'
            }`}
          >
            {f.texto}
          </button>
        ))}
      </div>
      {visibles.length === 0 ? (
        <EstadoVacio
          texto={
            filtro === 'cola'
              ? 'No tienes lecturas pendientes. Agrega la próxima referencia que vas a leer.'
              : 'Nada por aquí todavía.'
          }
        />
      ) : (
        <ul className="flex flex-col gap-1.5">
          {visibles.map((l) => (
            <li key={l.id}>
              <a
                href={hrefDe(`/lecturas/${l.id}`)}
                aria-current={seleccion === l.id ? 'page' : undefined}
                className={`block rounded-xl px-3 py-2.5 ${
                  seleccion === l.id
                    ? 'bg-primario text-superficie'
                    : 'bg-superficie-2/70 hover:bg-superficie-2'
                }`}
              >
                <span className="line-clamp-2 text-sm font-semibold">{l.referencia}</span>
                <span
                  className={`text-xs ${seleccion === l.id ? 'opacity-80' : 'text-tinta-suave'}`}
                >
                  {NOMBRE_ESTADO_LECTURA[l.estado]}
                  {l.citas.length > 0 &&
                    ` · ${l.citas.length} ${l.citas.length === 1 ? 'cita' : 'citas'}`}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </Tarjeta>
  );
}
