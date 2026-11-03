import { useState } from 'react';
import { db } from '@/db/db';
import type { ModuloSaberPro, PerfilAcademico } from '@/db/esquemas';
import { guardar, nuevoId } from '@/db/repositorio';
import { Campo } from '@/componentes/Formulario';
import { Icono } from '@/componentes/Icono';
import { EstadoVacio, Tarjeta } from '@/componentes/Tarjeta';
import { GENERICOS_SUGERIDOS } from '@/dominio/saberPro';
import { confirmar } from '@/utilidades/confirmar';

export function Modulos({
  perfil,
  modulos,
  examen,
}: {
  perfil: PerfilAcademico;
  modulos: ModuloSaberPro[];
  examen: string;
}) {
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<ModuloSaberPro['tipo']>('especifico');

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return;
    await guardar('modulosSaberPro', {
      id: nuevoId(),
      perfilId: perfil.id,
      nombre: nombre.trim(),
      tipo,
    });
    setNombre('');
  }

  async function agregarGenericos() {
    const existentes = new Set(modulos.map((m) => m.nombre.toLowerCase()));
    for (const n of GENERICOS_SUGERIDOS)
      if (!existentes.has(n.toLowerCase()))
        await guardar('modulosSaberPro', {
          id: nuevoId(),
          perfilId: perfil.id,
          nombre: n,
          tipo: 'generico',
        });
  }

  async function borrar(m: ModuloSaberPro) {
    if (!confirmar(`¿Borrar el módulo ${m.nombre} y sus prácticas?`)) return;
    await db.transaction('rw', db.modulosSaberPro, db.practicasSaberPro, async () => {
      await db.practicasSaberPro.where('moduloId').equals(m.id).delete();
      await db.modulosSaberPro.delete(m.id);
    });
  }

  const grupos = [
    { tipo: 'generico' as const, titulo: 'Genéricos' },
    { tipo: 'especifico' as const, titulo: 'Específicos de tu programa' },
  ];

  return (
    <Tarjeta titulo="Módulos" icono="saber">
      <p className="mb-4 text-sm text-tinta-suave">
        {examen} evalúa módulos genéricos, comunes a todos los programas, y específicos según tu
        programa. Los nombres sugeridos son un punto de partida: revisa en la guía vigente del ICFES
        cuáles te corresponden y ajústalos aquí.
      </p>
      {modulos.length === 0 ? (
        <EstadoVacio
          texto="Aún no tienes módulos. Empieza con los genéricos sugeridos o agrega los tuyos."
          accion={
            <button
              type="button"
              className="boton-secundario"
              onClick={() => void agregarGenericos()}
            >
              Agregar genéricos sugeridos
            </button>
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          {grupos.map((g) => {
            const lista = modulos.filter((m) => m.tipo === g.tipo);
            return (
              <div key={g.tipo}>
                <p className="etiqueta">{g.titulo}</p>
                {lista.length === 0 ? (
                  <p className="text-sm text-tinta-suave">Ninguno todavía.</p>
                ) : (
                  <ul className="flex flex-wrap gap-2">
                    {lista.map((m) => (
                      <li key={m.id} className="chip gap-1 pr-1">
                        {m.nombre}
                        <button
                          type="button"
                          className="rounded-full p-1 hover:bg-linea/60"
                          aria-label={`Borrar ${m.nombre}`}
                          onClick={() => void borrar(m)}
                        >
                          <Icono nombre="cerrar" tamano={12} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
          {!modulos.some((m) => m.tipo === 'generico') && (
            <button
              type="button"
              className="boton-secundario self-start"
              onClick={() => void agregarGenericos()}
            >
              Agregar genéricos sugeridos
            </button>
          )}
        </div>
      )}
      <form
        onSubmit={(e) => void agregar(e)}
        className="mt-4 grid gap-3 border-t border-linea/60 pt-4 sm:grid-cols-[1fr_auto_auto] sm:items-end"
      >
        <Campo etiqueta="Nuevo módulo">
          {(id) => (
            <input
              id={id}
              className="campo"
              value={nombre}
              placeholder="Por ejemplo, Diseño de obras de infraestructura"
              onChange={(e) => setNombre(e.target.value)}
            />
          )}
        </Campo>
        <Campo etiqueta="Tipo">
          {(id) => (
            <select
              id={id}
              className="campo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as ModuloSaberPro['tipo'])}
            >
              <option value="especifico">Específico</option>
              <option value="generico">Genérico</option>
            </select>
          )}
        </Campo>
        <button type="submit" className="boton-primario" disabled={!nombre.trim()}>
          Agregar
        </button>
      </form>
    </Tarjeta>
  );
}
