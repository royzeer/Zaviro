import { useState } from 'react';
import type { ModuloSaberPro, PerfilAcademico } from '@/db/esquemas';
import { guardar, nuevoId } from '@/db/repositorio';
import { Avisos, Campo, NumeroEntrada } from '@/componentes/Formulario';
import { Tarjeta } from '@/componentes/Tarjeta';
import { fechaInputAIso, isoAFechaInput } from '@/utilidades/fechas';

export function NuevaPractica({
  perfil,
  modulos,
}: {
  perfil: PerfilAcademico;
  modulos: ModuloSaberPro[];
}) {
  const [moduloId, setModuloId] = useState('');
  const [aciertos, setAciertos] = useState<number | null>(null);
  const [preguntas, setPreguntas] = useState<number | null>(null);
  const [fecha, setFecha] = useState(() => isoAFechaInput(new Date().toISOString()));
  const [avisos, setAvisos] = useState<string[]>([]);
  const [guardado, setGuardado] = useState(false);
  const elegido = modulos.some((m) => m.id === moduloId) ? moduloId : (modulos[0]?.id ?? '');

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const iso = fechaInputAIso(fecha);
    const faltan: string[] = [];
    if (!elegido) faltan.push('Primero agrega un módulo.');
    if (preguntas === null || !Number.isInteger(preguntas) || preguntas < 1)
      faltan.push('Escribe cuántas preguntas tenía la práctica (un número entero).');
    if (aciertos === null || !Number.isInteger(aciertos) || aciertos < 0)
      faltan.push('Escribe cuántas acertaste (un número entero).');
    else if (preguntas !== null && aciertos > preguntas)
      faltan.push('Los aciertos no pueden ser más que las preguntas.');
    if (!iso) faltan.push('Elige la fecha.');
    setAvisos(faltan);
    if (faltan.length || !iso || aciertos === null || preguntas === null) return;
    await guardar('practicasSaberPro', {
      id: nuevoId(),
      perfilId: perfil.id,
      moduloId: elegido,
      fecha: iso,
      aciertos,
      preguntas,
    });
    setAciertos(null);
    setGuardado(true);
  }

  return (
    <Tarjeta titulo="Registrar una práctica" icono="mas">
      <form onSubmit={(e) => void enviar(e)} className="flex flex-col gap-4" noValidate>
        <p className="text-sm text-tinta-suave">
          Guarda cada práctica como aciertos sobre preguntas. Zaviro compara tus prácticas en
          porcentaje y no las convierte a la escala oficial, porque esa la define el ICFES en cada
          aplicación.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo etiqueta="Módulo" className="sm:col-span-2">
            {(id) => (
              <select
                id={id}
                className="campo"
                value={elegido}
                onChange={(e) => {
                  setModuloId(e.target.value);
                  setGuardado(false);
                }}
                disabled={modulos.length === 0}
              >
                {modulos.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            )}
          </Campo>
          <Campo etiqueta="Aciertos">
            {(id) => (
              <NumeroEntrada
                id={id}
                valor={aciertos}
                vacioPermitido
                min={0}
                onCambio={(v) => {
                  setAciertos(v);
                  setGuardado(false);
                }}
              />
            )}
          </Campo>
          <Campo etiqueta="Preguntas">
            {(id) => (
              <NumeroEntrada
                id={id}
                valor={preguntas}
                vacioPermitido
                min={1}
                onCambio={setPreguntas}
              />
            )}
          </Campo>
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
          <div className="flex items-end">
            <button type="submit" className="boton-primario w-full" disabled={modulos.length === 0}>
              Guardar práctica
            </button>
          </div>
        </div>
        <Avisos avisos={avisos} />
        {guardado && (
          <p role="status" className="text-sm font-semibold text-exito">
            Práctica guardada.
          </p>
        )}
      </form>
    </Tarjeta>
  );
}
