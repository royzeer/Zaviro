import { useState } from 'react';
import { NOMBRE_PRUEBA, SABER11 } from '@/config/saber11';
import type { PerfilAcademico } from '@/db/esquemas';
import { guardar, nuevoId } from '@/db/repositorio';
import { Avisos, Campo, NumeroEntrada } from '@/componentes/Formulario';
import { Tarjeta } from '@/componentes/Tarjeta';
import { PRUEBAS_SABER11, type PruebaSaber11 } from '@/dominio/catalogo';
import { puntajeGlobal } from '@/dominio/saber11';
import { fechaInputAIso, isoAFechaInput } from '@/utilidades/fechas';

type Borrador = Record<PruebaSaber11, number | null>;
const vacio = (): Borrador => ({
  lecturaCritica: null,
  matematicas: null,
  socialesCiudadanas: null,
  cienciasNaturales: null,
  ingles: null,
});

export function NuevoSimulacro({ perfil }: { perfil: PerfilAcademico }) {
  const [puntajes, setPuntajes] = useState<Borrador>(vacio);
  const [fecha, setFecha] = useState(() => isoAFechaInput(new Date().toISOString()));
  const [avisos, setAvisos] = useState<string[]>([]);
  const [guardado, setGuardado] = useState(false);
  const completos = PRUEBAS_SABER11.every((p) => {
    const v = puntajes[p];
    return v !== null && v >= 0 && v <= SABER11.maximoPrueba;
  });
  const global = completos ? puntajeGlobal(puntajes as Record<PruebaSaber11, number>) : null;

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const iso = fechaInputAIso(fecha);
    const faltan: string[] = [];
    if (!completos) faltan.push('Escribe el puntaje de las cinco pruebas, de 0 a 100.');
    if (!iso) faltan.push('Elige la fecha del simulacro.');
    setAvisos(faltan);
    if (faltan.length || !iso || global === null) return;
    await guardar('simulacros', {
      id: nuevoId(),
      perfilId: perfil.id,
      fecha: iso,
      puntajes: puntajes as Record<PruebaSaber11, number>,
      puntajeGlobal: global,
    });
    setPuntajes(vacio());
    setGuardado(true);
  }

  return (
    <Tarjeta titulo="Registrar un simulacro" icono="saber">
      <form onSubmit={(e) => void enviar(e)} className="flex flex-col gap-4" noValidate>
        <p className="text-sm text-tinta-suave">
          Escribe el puntaje de cada prueba (0 a 100). El global (0 a 500) es el promedio ponderado
          de las cinco pruebas por 5: Lectura Crítica, Matemáticas, Sociales y Ciencias Naturales
          pesan 3 e Inglés pesa 1.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {PRUEBAS_SABER11.map((p) => (
            <Campo key={p} etiqueta={NOMBRE_PRUEBA[p]}>
              {(id) => (
                <NumeroEntrada
                  id={id}
                  valor={puntajes[p]}
                  vacioPermitido
                  min={0}
                  max={SABER11.maximoPrueba}
                  placeholder="0 a 100"
                  onCambio={(v) => {
                    setGuardado(false);
                    setPuntajes((x) => ({ ...x, [p]: v }));
                  }}
                />
              )}
            </Campo>
          ))}
          <Campo etiqueta="Fecha">
            {(id) => (
              <input
                id={id}
                type="date"
                className="campo"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
            )}
          </Campo>
        </div>
        <Avisos avisos={avisos} />
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-superficie-2/70 px-4 py-3">
          <p className="text-sm">
            <span className="text-tinta-suave">Puntaje global </span>
            <span className="text-2xl font-extrabold tabular-nums" aria-live="polite">
              {global ?? '--'}
            </span>
            <span className="text-tinta-suave"> / 500</span>
          </p>
          <button type="submit" className="boton-primario">
            Guardar simulacro
          </button>
        </div>
        {guardado && (
          <p role="status" className="text-sm font-semibold text-exito">
            Simulacro guardado.
          </p>
        )}
      </form>
    </Tarjeta>
  );
}
