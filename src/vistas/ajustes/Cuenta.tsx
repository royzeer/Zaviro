import { useState, type FormEvent } from 'react';
import { Icono } from '@/componentes/Icono';
import { Tarjeta } from '@/componentes/Tarjeta';
import { useSesion, type Usuario } from '@/estado/sesion';
import { textoSincronizacion } from '@/sincronizacion/texto';
import { api, ErrorApi } from '@/sincronizacion/cliente';
import { confirmar } from '@/utilidades/confirmar';

function CambiarContrasena({ alTerminar }: { alTerminar: (m: string) => void }) {
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (nueva.length < 8) return setError('La nueva contraseña debe tener mínimo 8 caracteres.');
    setEnviando(true);
    setError('');
    try {
      await api.put('/auth/contrasena', { actual, nueva });
      alTerminar('Contraseña actualizada.');
    } catch (err) {
      setError(err instanceof ErrorApi ? err.message : 'No se pudo cambiar la contraseña.');
      setEnviando(false);
    }
  }

  return (
    <form
      onSubmit={enviar}
      className="flex flex-col gap-3 rounded-xl bg-superficie-2 p-4"
      noValidate
    >
      <div>
        <label htmlFor="clave-actual" className="etiqueta">
          Contraseña actual
        </label>
        <input
          id="clave-actual"
          type="password"
          autoComplete="current-password"
          className="campo"
          value={actual}
          onChange={(e) => setActual(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="clave-nueva" className="etiqueta">
          Contraseña nueva
        </label>
        <input
          id="clave-nueva"
          type="password"
          autoComplete="new-password"
          className="campo"
          value={nueva}
          onChange={(e) => setNueva(e.target.value)}
        />
      </div>
      {error && (
        <p role="alert" className="text-sm font-semibold text-peligro">
          {error}
        </p>
      )}
      <button className="boton-primario self-start" disabled={enviando}>
        Guardar contraseña
      </button>
    </form>
  );
}

export function Cuenta({ usuario }: { usuario: Usuario }) {
  const sincronizacion = useSesion((s) => s.sincronizacion);
  const sincronizarAhora = useSesion((s) => s.sincronizarAhora);
  const cerrarSesion = useSesion((s) => s.cerrarSesion);
  const borrarCuenta = useSesion((s) => s.borrarCuenta);
  const [cambiandoClave, setCambiandoClave] = useState(false);
  const [mensaje, setMensaje] = useState('');

  async function salir() {
    const pendientes = await cerrarSesion();
    if (pendientes === 0) return;
    const seguir = confirmar(
      `Hay ${pendientes} cambios que no se han podido subir porque no hay conexión. Si cierras la sesión ahora se pierden. ¿Cerrar de todas formas?`,
    );
    if (seguir) await cerrarSesion(true);
  }

  async function borrar() {
    const clave = window.prompt(
      'Esto borra tu cuenta y todos tus datos del servidor y de este navegador. No se puede deshacer. Escribe tu contraseña para confirmar:',
    );
    if (!clave) return;
    try {
      await borrarCuenta(clave);
    } catch (err) {
      setMensaje(err instanceof Error ? err.message : 'No se pudo borrar la cuenta.');
    }
  }

  return (
    <Tarjeta titulo="Tu cuenta" icono="perfil">
      <p className="font-bold">{usuario.nombre}</p>
      <p className="text-sm text-tinta-suave">{usuario.correo}</p>
      <p role="status" className="mt-3 flex items-start gap-2 text-sm text-tinta-suave">
        <Icono nombre="nube" tamano={16} className="mt-0.5 shrink-0" />
        {textoSincronizacion(sincronizacion)}
      </p>
      {sincronizacion.estado === 'error' && sincronizacion.mensaje && (
        <p className="mt-1 text-xs text-peligro">{sincronizacion.mensaje}</p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          className="boton-secundario"
          onClick={() => void sincronizarAhora()}
          disabled={sincronizacion.estado === 'sincronizando'}
        >
          Sincronizar ahora
        </button>
        <button className="boton-secundario" onClick={() => setCambiandoClave((v) => !v)}>
          Cambiar contraseña
        </button>
        <button className="boton-secundario" onClick={() => void salir()}>
          <Icono nombre="salir" tamano={16} />
          Cerrar sesión
        </button>
      </div>
      {cambiandoClave && (
        <div className="mt-4">
          <CambiarContrasena
            alTerminar={(m) => {
              setCambiandoClave(false);
              setMensaje(m);
            }}
          />
        </div>
      )}
      {mensaje && (
        <p role="status" className="mt-3 text-sm font-semibold">
          {mensaje}
        </p>
      )}
      <button
        className="mt-4 text-xs font-semibold text-peligro underline underline-offset-2"
        onClick={() => void borrar()}
      >
        Borrar mi cuenta
      </button>
    </Tarjeta>
  );
}
