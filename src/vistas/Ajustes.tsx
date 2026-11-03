import { useState } from 'react';
import { cargarDatosEjemplo, hayDatosEjemplo } from '@/db/datosEjemplo';
import { borrarDatosEjemplo } from '@/db/repositorio';
import { useConsulta } from '@/db/useConsulta';
import { useApp, type PreferenciaTema } from '@/estado/app';
import { Icono } from '@/componentes/Icono';
import { Tarjeta } from '@/componentes/Tarjeta';
import { Respaldo } from './ajustes/Respaldo';

const OPCIONES_TEMA: { valor: PreferenciaTema; texto: string }[] = [
  { valor: 'claro', texto: 'Claro' },
  { valor: 'oscuro', texto: 'Oscuro' },
  { valor: 'sistema', texto: 'Según el sistema' },
];

export function Ajustes() {
  const tema = useApp((s) => s.tema);
  const setTema = useApp((s) => s.setTema);
  const [mensaje, setMensaje] = useState('');
  const hayEjemplo = useConsulta(() => hayDatosEjemplo());

  async function cargarEjemplos() {
    await cargarDatosEjemplo();
    setMensaje(
      'Se cargaron cuatro perfiles de ejemplo: tecnólogo, ingeniería, bachillerato y maestría.',
    );
  }

  async function borrarEjemplos() {
    const n = await borrarDatosEjemplo();
    setMensaje(n === 0 ? 'No había datos de ejemplo.' : `Se borraron ${n} registros de ejemplo.`);
  }

  return (
    <div className="grid items-start gap-5 md:grid-cols-2">
      <Tarjeta titulo="Apariencia" icono="sol">
        <fieldset>
          <legend className="etiqueta">Tema</legend>
          <div className="flex flex-wrap gap-2">
            {OPCIONES_TEMA.map((o) => (
              <label
                key={o.valor}
                className={`cursor-pointer rounded-xl border px-4 py-2 text-sm font-semibold transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-acento ${
                  tema === o.valor
                    ? 'border-primario bg-primario text-sobre-primario'
                    : 'border-linea bg-superficie hover:bg-superficie-2'
                }`}
              >
                <input
                  type="radio"
                  name="tema"
                  value={o.valor}
                  checked={tema === o.valor}
                  onChange={() => setTema(o.valor)}
                  className="sr-only"
                />
                {o.texto}
              </label>
            ))}
          </div>
        </fieldset>
      </Tarjeta>

      <Respaldo />

      <Tarjeta titulo="Datos de ejemplo" icono="papelera">
        <p className="mb-4 text-sm text-tinta-suave">
          Todo lo que guardas vive solo en este dispositivo. Los datos de ejemplo sirven para probar
          la app y puedes quitarlos cuando quieras sin tocar tus datos reales.
        </p>
        <div className="flex flex-wrap gap-2">
          {hayEjemplo ? (
            <button className="boton-secundario" onClick={borrarEjemplos}>
              <Icono nombre="papelera" tamano={16} />
              Borrar datos de ejemplo
            </button>
          ) : (
            <button className="boton-secundario" onClick={cargarEjemplos}>
              <Icono nombre="mas" tamano={16} />
              Cargar datos de ejemplo
            </button>
          )}
        </div>
        <p className="mt-3 min-h-5 text-sm text-tinta-suave" role="status">
          {mensaje}
        </p>
      </Tarjeta>
    </div>
  );
}
