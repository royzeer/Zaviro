// Pruebas de integración: levantan la API completa contra una base de datos de pruebas.
// Requieren MySQL en ejecución (variables DB_* del .env o del entorno de CI).
import mysql from 'mysql2/promise';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../src/app';
import { datosConexion, pool } from '../src/config/db';
import { inicializarBase } from '../src/scripts/init-db';
import { LIMITE_POR_PAGINA } from '../src/services/sincronizacion.service';

beforeAll(async () => {
  const { database, ...servidor } = datosConexion();
  const c = await mysql.createConnection(servidor);
  await c.query(`DROP DATABASE IF EXISTS \`${database}\``);
  await c.end();
  await inicializarBase();
});

afterAll(async () => {
  await pool.end();
});

const CLAVE = 'clave-segura-1';

async function registrar(correo: string, nombre = 'Prueba') {
  const res = await request(app)
    .post('/api/auth/registro')
    .send({ nombre, correo, contrasena: CLAVE });
  expect(res.status).toBe(201);
  return res.body.data.token as string;
}

describe('Cuentas', () => {
  it('registra un usuario sin devolver la contraseña', async () => {
    const res = await request(app)
      .post('/api/auth/registro')
      .send({ nombre: ' Ana ', correo: 'ANA@test.com', contrasena: CLAVE });
    expect(res.status).toBe(201);
    expect(res.body.data.usuario).toMatchObject({ nombre: 'Ana', correo: 'ana@test.com' });
    expect(res.body.data.usuario.contrasena_hash).toBeUndefined();
    expect(res.body.data.token).toEqual(expect.any(String));
  });

  it('guarda la contraseña cifrada', async () => {
    const [f] = await pool.query('SELECT contrasena_hash FROM usuarios WHERE correo = ?', [
      'ana@test.com',
    ]);
    const hash = (f as { contrasena_hash: string }[])[0]!.contrasena_hash;
    expect(hash).not.toContain(CLAVE);
    expect(hash).toMatch(/^\$2[aby]\$/);
  });

  it('no permite correos repetidos', async () => {
    const res = await request(app)
      .post('/api/auth/registro')
      .send({ nombre: 'Otra', correo: 'ana@test.com', contrasena: CLAVE });
    expect(res.status).toBe(409);
    expect(res.body.data.errores.correo).toBeDefined();
  });

  it('valida los datos del registro', async () => {
    const res = await request(app)
      .post('/api/auth/registro')
      .send({ nombre: 'A', correo: 'malo', contrasena: '123' });
    expect(res.status).toBe(422);
    expect(Object.keys(res.body.data.errores).sort()).toEqual(['contrasena', 'correo', 'nombre']);
  });

  it('inicia sesión con datos correctos y rechaza los incorrectos con el mismo mensaje', async () => {
    const ok = await request(app)
      .post('/api/auth/login')
      .send({ correo: 'Ana@test.com', contrasena: CLAVE });
    expect(ok.status).toBe(200);
    expect(ok.body.data.usuario.correo).toBe('ana@test.com');

    const mala = await request(app)
      .post('/api/auth/login')
      .send({ correo: 'ana@test.com', contrasena: 'otra-cosa' });
    const nadie = await request(app)
      .post('/api/auth/login')
      .send({ correo: 'nadie@test.com', contrasena: CLAVE });
    expect(mala.status).toBe(401);
    expect(nadie.status).toBe(401);
    expect(mala.body.mensaje).toBe(nadie.body.mensaje);
  });

  it('protege las rutas privadas', async () => {
    expect((await request(app).get('/api/auth/perfil')).status).toBe(401);
    const falso = await request(app).get('/api/auth/perfil').set('Authorization', 'Bearer abc');
    expect(falso.status).toBe(401);
  });

  it('cambia el nombre y la contraseña', async () => {
    const token = await registrar('beto@test.com', 'Beto');
    const auth = { Authorization: `Bearer ${token}` };
    const nombre = await request(app).put('/api/auth/perfil').set(auth).send({ nombre: 'Alberto' });
    expect(nombre.body.data.nombre).toBe('Alberto');

    const mal = await request(app)
      .put('/api/auth/contrasena')
      .set(auth)
      .send({ actual: 'x', nueva: 'nueva-clave-2' });
    expect(mal.status).toBe(422);
    const bien = await request(app)
      .put('/api/auth/contrasena')
      .set(auth)
      .send({ actual: CLAVE, nueva: 'nueva-clave-2' });
    expect(bien.status).toBe(200);
    const login = await request(app)
      .post('/api/auth/login')
      .send({ correo: 'beto@test.com', contrasena: 'nueva-clave-2' });
    expect(login.status).toBe(200);
  });

  it('borra la cuenta con sus datos solo si la contraseña es correcta', async () => {
    const token = await registrar('caro@test.com');
    const auth = { Authorization: `Bearer ${token}` };
    await request(app)
      .post('/api/sincronizacion')
      .set(auth)
      .send({ cambios: [{ tabla: 'materias', id: 'm1', datos: { id: 'm1' } }] });

    expect(
      (await request(app).delete('/api/auth/cuenta').set(auth).send({ contrasena: 'x' })).status,
    ).toBe(422);
    expect(
      (await request(app).delete('/api/auth/cuenta').set(auth).send({ contrasena: CLAVE })).status,
    ).toBe(200);
    expect((await request(app).get('/api/auth/perfil').set(auth)).status).toBe(401);
    const [filas] = await pool.query(
      'SELECT COUNT(*) AS n FROM registros r LEFT JOIN usuarios u ON u.id = r.usuario_id WHERE u.id IS NULL',
    );
    expect(Number((filas as { n: number }[])[0]!.n)).toBe(0);
  });
});

describe('Sincronización', () => {
  let auth: Record<string, string>;
  let otro: Record<string, string>;

  beforeAll(async () => {
    auth = { Authorization: `Bearer ${await registrar('sync@test.com')}` };
    otro = { Authorization: `Bearer ${await registrar('otro@test.com')}` };
  });

  it('guarda cambios y los devuelve desde una revisión', async () => {
    const envio = await request(app)
      .post('/api/sincronizacion')
      .set(auth)
      .send({
        cambios: [
          { tabla: 'materias', id: 'm1', datos: { id: 'm1', nombre: 'Física', notas: [3.5, 4] } },
          { tabla: 'temas', id: 't1', datos: { id: 't1', titulo: 'Vectores ñ' } },
        ],
      });
    expect(envio.status).toBe(200);
    expect(envio.body.data).toEqual({ revision: 2, guardados: 2 });

    const todo = await request(app).get('/api/sincronizacion').set(auth);
    expect(todo.body.data.revision).toBe(2);
    expect(todo.body.data.hayMas).toBe(false);
    expect(todo.body.data.cambios).toEqual([
      {
        tabla: 'materias',
        id: 'm1',
        datos: { id: 'm1', nombre: 'Física', notas: [3.5, 4] },
        revision: 1,
      },
      { tabla: 'temas', id: 't1', datos: { id: 't1', titulo: 'Vectores ñ' }, revision: 2 },
    ]);

    const nada = await request(app).get('/api/sincronizacion?desde=2').set(auth);
    expect(nada.body.data).toEqual({ cambios: [], revision: 2, hayMas: false });
  });

  it('una edición y un borrado reemplazan al registro anterior', async () => {
    await request(app)
      .post('/api/sincronizacion')
      .set(auth)
      .send({
        cambios: [
          { tabla: 'materias', id: 'm1', datos: { id: 'm1', nombre: 'Física II' } },
          { tabla: 'temas', id: 't1', datos: null },
        ],
      });
    const res = await request(app).get('/api/sincronizacion?desde=2').set(auth);
    expect(res.body.data.cambios).toEqual([
      { tabla: 'materias', id: 'm1', datos: { id: 'm1', nombre: 'Física II' }, revision: 3 },
      { tabla: 'temas', id: 't1', datos: null, revision: 4 },
    ]);
    const resumen = await request(app).get('/api/sincronizacion/resumen').set(auth);
    expect(resumen.body.data).toEqual({ registros: 1, revision: 4 });
  });

  it('cada usuario ve solo sus datos', async () => {
    const res = await request(app).get('/api/sincronizacion').set(otro);
    expect(res.body.data.cambios).toEqual([]);
    await request(app)
      .post('/api/sincronizacion')
      .set(otro)
      .send({ cambios: [{ tabla: 'materias', id: 'm1', datos: { id: 'm1', nombre: 'Química' } }] });
    const mio = await request(app).get('/api/sincronizacion').set(auth);
    expect(mio.body.data.cambios.find((c: { id: string }) => c.id === 'm1').datos.nombre).toBe(
      'Física II',
    );
  });

  it('entrega por páginas cuando hay muchos cambios', async () => {
    const token = { Authorization: `Bearer ${await registrar('paginas@test.com')}` };
    const total = LIMITE_POR_PAGINA + 50;
    for (let i = 0; i < total; i += 200) {
      const cambios = Array.from({ length: Math.min(200, total - i) }, (_, j) => ({
        tabla: 'tarjetas',
        id: `t${i + j}`,
        datos: { id: `t${i + j}` },
      }));
      expect(
        (await request(app).post('/api/sincronizacion').set(token).send({ cambios })).status,
      ).toBe(200);
    }
    const p1 = await request(app).get('/api/sincronizacion').set(token);
    expect(p1.body.data.cambios).toHaveLength(LIMITE_POR_PAGINA);
    expect(p1.body.data.hayMas).toBe(true);
    const p2 = await request(app)
      .get(`/api/sincronizacion?desde=${p1.body.data.revision}`)
      .set(token);
    expect(p2.body.data.cambios).toHaveLength(50);
    expect(p2.body.data.hayMas).toBe(false);
    expect(p2.body.data.revision).toBe(total);
  });

  it('dos envíos al mismo tiempo nunca comparten revisiones', async () => {
    const token = { Authorization: `Bearer ${await registrar('paralelo@test.com')}` };
    const envios = Array.from({ length: 5 }, (_, i) =>
      request(app)
        .post('/api/sincronizacion')
        .set(token)
        .send({
          cambios: [
            { tabla: 'apuntes', id: `a${i}`, datos: { i } },
            { tabla: 'apuntes', id: `b${i}`, datos: { i } },
          ],
        }),
    );
    await Promise.all(envios);
    const res = await request(app).get('/api/sincronizacion').set(token);
    const revisiones = res.body.data.cambios.map((c: { revision: number }) => c.revision);
    expect(new Set(revisiones).size).toBe(10);
    expect(Math.max(...revisiones)).toBe(10);
  });

  it('rechaza cambios inválidos', async () => {
    const res = await request(app)
      .post('/api/sincronizacion')
      .set(auth)
      .send({ cambios: [{ tabla: 'x;', id: 'a', datos: null }] });
    expect(res.status).toBe(422);
  });
});

describe('Varios', () => {
  it('responde la ruta de salud sin sesión', async () => {
    const res = await request(app).get('/api/salud');
    expect(res.status).toBe(200);
  });

  it('avisa cuando el JSON está mal escrito', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{malo');
    expect(res.status).toBe(400);
  });
});
