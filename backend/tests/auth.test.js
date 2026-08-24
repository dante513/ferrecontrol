// tests/auth.test.js
// Prueba el endpoint POST /api/auth/login de punta a punta usando Supertest,
// pero contra una base de datos SIMULADA: no hay PostgreSQL real en este
// entorno, así que se reemplaza `pg` por un mock que responde lo que cada
// prueba necesita. Esto valida la lógica de la ruta (validaciones, mensajes
// de error genéricos, generación del token) sin depender de tener Postgres
// corriendo — antes de entregar, complementa esto con una prueba manual
// contra la base real (ver docs/04-pruebas/01-plan-pruebas.md, caso CP-01).

process.env.JWT_SECRET = 'secreto_de_prueba_no_usar_en_produccion';
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgres://fake-solo-para-pruebas';

const mockPool = { query: jest.fn().mockResolvedValue({ rows: [] }), connect: jest.fn().mockResolvedValue({ release: jest.fn() }) };
jest.mock('pg', () => ({ Pool: jest.fn(() => mockPool) }));

const bcrypt = require('bcryptjs');
const request = require('supertest');
const app = require('../server');

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    mockPool.query.mockClear();
    mockPool.query.mockResolvedValue({ rows: [] }); // valor por defecto para llamadas no especificadas (ej. la auditoría)
  });

  test('rechaza con 400 si faltan campos', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'admin@ferrecontrol.com' });
    expect(res.status).toBe(400);
  });

  test('rechaza con 401 y mensaje genérico si el correo no existe', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] }); // SELECT no encuentra al usuario

    const res = await request(app).post('/api/auth/login').send({ email: 'nadie@ferrecontrol.com', password: 'cualquiera' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Credenciales incorrectas.');
  });

  test('rechaza con 401 y el MISMO mensaje genérico si la contraseña es incorrecta (no revela cuál campo falló)', async () => {
    const hashReal = await bcrypt.hash('claveCorrecta123', 10);
    mockPool.query.mockResolvedValueOnce({
      rows: [{ id: 1, nombre: 'Admin', email: 'admin@ferrecontrol.com', password_hash: hashReal, rol: 'Administrador', estado: 'Activo' }],
    });

    const res = await request(app).post('/api/auth/login').send({ email: 'admin@ferrecontrol.com', password: 'claveIncorrecta' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Credenciales incorrectas.');
  });

  test('rechaza con 403 si el usuario existe pero está Inactivo', async () => {
    const hashReal = await bcrypt.hash('claveCorrecta123', 10);
    mockPool.query.mockResolvedValueOnce({
      rows: [{ id: 2, nombre: 'Ex empleado', email: 'ex@ferrecontrol.com', password_hash: hashReal, rol: 'Vendedor', estado: 'Inactivo' }],
    });

    const res = await request(app).post('/api/auth/login').send({ email: 'ex@ferrecontrol.com', password: 'claveCorrecta123' });

    expect(res.status).toBe(403);
  });

  test('con credenciales correctas responde 200 con un token y los datos del usuario (sin password_hash)', async () => {
    const hashReal = await bcrypt.hash('claveCorrecta123', 10);
    mockPool.query.mockResolvedValueOnce({
      rows: [{ id: 1, nombre: 'Admin', email: 'admin@ferrecontrol.com', password_hash: hashReal, rol: 'Administrador', estado: 'Activo' }],
    });

    const res = await request(app).post('/api/auth/login').send({ email: 'admin@ferrecontrol.com', password: 'claveCorrecta123' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.usuario.email).toBe('admin@ferrecontrol.com');
    expect(res.body.usuario.password_hash).toBeUndefined(); // nunca debe salir el hash
  });
});
