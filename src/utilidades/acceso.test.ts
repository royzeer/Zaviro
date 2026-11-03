import { describe, expect, it } from 'vitest';
import { revisarAcceso } from './acceso';

describe('revisarAcceso', () => {
  it('pide nombre, correo y contraseña larga al registrarse', () => {
    expect(
      Object.keys(revisarAcceso('registro', { nombre: 'A', correo: 'x', contrasena: '123' })),
    ).toEqual(['nombre', 'correo', 'contrasena']);
    expect(
      revisarAcceso('registro', { nombre: 'Ana', correo: 'ana@correo.co', contrasena: '12345678' }),
    ).toEqual({});
  });
  it('al entrar solo pide correo y contraseña', () => {
    expect(
      revisarAcceso('login', { nombre: '', correo: 'ana@correo.co', contrasena: 'x' }),
    ).toEqual({});
    expect(revisarAcceso('login', { nombre: '', correo: 'ana@correo.co', contrasena: '' })).toEqual(
      {
        contrasena: 'Escribe tu contraseña',
      },
    );
  });
});
