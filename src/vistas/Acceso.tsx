// Pantallas para crear la cuenta e iniciar sesión.
import { useEffect, useState, type FormEvent } from 'react';
import { Icono } from '@/componentes/Icono';
import { useSesion } from '@/estado/sesion';
import { api, ErrorApi } from '@/sincronizacion/cliente';
import { revisarAcceso, type Modo } from '@/utilidades/acceso';

const VENTAJAS = [
  'Tus materias, apuntes y repasos guardados en tu cuenta.',
  'Abre Zaviro en el celular y en el computador con los mismos datos.',
  'Sigue funcionando sin internet y se pone al día al volver la conexión.',
];

export function Acceso() {
  const entrar = useSesion((s) => s.entrar);
  const [modo, setModo] = useState<Modo>('login');
  const [datos, setDatos] = useState({ nombre: '', correo: '', contrasena: '' });
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [lento, setLento] = useState(false);
  const esRegistro = modo === 'registro';

  // El servidor gratuito se duerme: se despierta mientras la persona escribe.
  useEffect(() => {
    void api.get('/salud').catch(() => {});
  }, []);

  useEffect(() => {
    document.title = esRegistro ? 'Crear cuenta · Zaviro' : 'Iniciar sesión · Zaviro';
  }, [esRegistro]);

  useEffect(() => {
    if (!enviando) return setLento(false);
    const t = setTimeout(() => setLento(true), 4000);
    return () => clearTimeout(t);
  }, [enviando]);

  function cambiarModo(m: Modo) {
    setModo(m);
    setErrores({});
    setError('');
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const encontrados = revisarAcceso(modo, datos);
    setErrores(encontrados);
    if (Object.keys(encontrados).length) return;
    setEnviando(true);
    setError('');
    try {
      await entrar(
        modo,
        esRegistro
          ? {
              nombre: datos.nombre.trim(),
              correo: datos.correo.trim(),
              contrasena: datos.contrasena,
            }
          : { correo: datos.correo.trim(), contrasena: datos.contrasena },
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo entrar');
      setErrores(err instanceof ErrorApi ? err.errores : {});
      setEnviando(false);
    }
  }

  const campo = (
    nombre: keyof typeof datos,
    etiqueta: string,
    tipo: string,
    autocompletar: string,
  ) => (
    <div>
      <label htmlFor={`acceso-${nombre}`} className="etiqueta">
        {etiqueta}
      </label>
      <input
        id={`acceso-${nombre}`}
        className="campo"
        type={tipo}
        autoComplete={autocompletar}
        value={datos[nombre]}
        aria-invalid={errores[nombre] ? true : undefined}
        aria-describedby={errores[nombre] ? `acceso-${nombre}-error` : undefined}
        onChange={(e) => setDatos({ ...datos, [nombre]: e.target.value })}
      />
      {errores[nombre] && (
        <p id={`acceso-${nombre}-error`} className="mt-1.5 text-xs font-semibold text-peligro">
          {errores[nombre]}
        </p>
      )}
    </div>
  );

  return (
    <main className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <section className="vidrio m-3 flex flex-col justify-between gap-8 rounded-[1.75rem] px-6 py-8 text-tinta sm:px-10 lg:py-12">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-primario text-sobre-primario shadow-tarjeta">
            <Icono nombre="raiz" tamano={22} />
          </span>
          <span className="text-lg font-extrabold tracking-tight">Zaviro</span>
        </div>
        <div className="max-w-md">
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
            Estudia con un plan que se arma solo.
          </h1>
          <ul className="mt-6 hidden flex-col gap-3 sm:flex">
            {VENTAJAS.map((v) => (
              <li key={v} className="flex items-start gap-3 text-[15px] leading-snug">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primario text-sobre-primario">
                  <Icono nombre="nube" tamano={14} />
                </span>
                {v}
              </li>
            ))}
          </ul>
        </div>
        <p className="hidden text-xs lg:block">
          Hecho en Colombia para estudiantes de todos los niveles.
        </p>
      </section>

      <section className="flex items-start justify-center px-4 py-8 sm:px-6 lg:items-center">
        <div className="w-full max-w-md">
          <div
            role="tablist"
            aria-label="Tipo de acceso"
            className="vidrio mb-6 grid grid-cols-2 gap-1 rounded-full p-1"
          >
            {(['login', 'registro'] as const).map((m) => (
              <button
                key={m}
                role="tab"
                type="button"
                aria-selected={modo === m}
                onClick={() => cambiarModo(m)}
                className={`rounded-full py-2 text-sm font-semibold transition-colors ${
                  modo === m ? 'bg-superficie text-tinta shadow-tarjeta' : 'text-tinta-suave'
                }`}
              >
                {m === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
              </button>
            ))}
          </div>

          <h2 className="text-2xl font-extrabold tracking-tight">
            {esRegistro ? 'Crea tu cuenta' : 'Hola de nuevo'}
          </h2>
          <p className="mb-5 mt-1 text-sm text-tinta-suave">
            {esRegistro ? 'Te toma menos de un minuto.' : 'Entra para seguir con tu estudio.'}
          </p>

          <form className="tarjeta flex flex-col gap-4" onSubmit={enviar} noValidate>
            {error && (
              <p
                role="alert"
                className="rounded-xl bg-peligro/10 px-3.5 py-2.5 text-sm font-semibold text-peligro"
              >
                {error}
              </p>
            )}
            {esRegistro && campo('nombre', 'Nombre', 'text', 'name')}
            {campo('correo', 'Correo', 'email', 'email')}
            {campo(
              'contrasena',
              'Contraseña',
              'password',
              esRegistro ? 'new-password' : 'current-password',
            )}
            <button className="boton-primario mt-1" disabled={enviando}>
              {enviando ? 'Un momento…' : esRegistro ? 'Crear cuenta' : 'Entrar'}
            </button>
            {lento && (
              <p role="status" className="text-center text-xs text-tinta-suave">
                El servidor se está despertando. La primera vez puede tardar hasta un minuto.
              </p>
            )}
          </form>
          <p className="mt-4 text-center text-sm text-tinta-suave">
            {esRegistro ? '¿Ya tienes cuenta? ' : '¿Primera vez en Zaviro? '}
            <button
              type="button"
              className="font-semibold text-tinta underline underline-offset-2"
              onClick={() => cambiarModo(esRegistro ? 'login' : 'registro')}
            >
              {esRegistro ? 'Inicia sesión' : 'Crea tu cuenta'}
            </button>
          </p>
        </div>
      </section>
    </main>
  );
}
