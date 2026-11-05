import { describe, expect, it } from 'vitest';
import { mensajeSinConexion } from './cliente';

describe('mensajeSinConexion', () => {
  it('avisa que falta VITE_API_URL cuando la app publicada apunta a localhost', () => {
    expect(mensajeSinConexion('http://localhost:4000/api', false)).toMatch(/VITE_API_URL/);
  });
  it('en desarrollo o con la URL puesta da el mensaje general', () => {
    expect(mensajeSinConexion('http://localhost:4000/api', true)).toMatch(/^No hay conexión/);
    expect(mensajeSinConexion('https://zaviro.onrender.com/api', false)).toMatch(
      /^No hay conexión/,
    );
  });
});
