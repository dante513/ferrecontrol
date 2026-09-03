// tests/usuarios.test.js
process.env.JWT_SECRET = 'secreto_de_prueba_no_usar_en_produccion';
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgres://fake-solo-para-pruebas';

const mockPool = { query: jest.fn().mockResolvedValue({ rows: [] }), connect: jest.fn().mockResolvedValue({ query: jest.fn(), release: jest.fn() }) };
jest.mock('pg', () => ({ Pool: jest.fn(() => mockPool) }));

const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../server');

const ADMIN_ID = 'admin-uuid-0001';
const tokenAdmin = jwt.sign({ id: ADMIN_ID, nombre: 'Admin', email: 'admin@ferrecontrol.com', rol: 'Administrador' }, process.env.JWT_SECRET);
const tokenVendedor = jwt.sign({ id: 'vendedor-uuid-0002', nombre: 'Vendedor', email: 'v@ferrecontrol.com', rol: 'Vendedor' }, process.env.JWT_SECRET);

beforeEach(() => {
  mockPool.query.mockClear();
  mockPool.query.mockResolvedValue({ rows: [] });
});

describe('PUT /api/usuarios/:id', () => {
  test('rechaza con 403 si el rol no es Administrador', async () => {
    const res = await request(app)
      .put('/api/usuarios/otro-uuid')
      .set('Authorization', `Bearer ${tokenVendedor}`)
      .set('Cookie', 'csrfToken=test-csrf').set('X-CSRF-Token', 'test-csrf')
      .send({ nombre: 'X', email: 'x@ferrecontrol.com' });

    expect(res.status).toBe(403);
  });

  test('rechaza con 400 si faltan nombre o correo', async () => {
    const res = await request(app)
      .put('/api/usuarios/otro-uuid')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .set('Cookie', 'csrfToken=test-csrf').set('X-CSRF-Token', 'test-csrf')
      .send({ nombre: 'X' });

    expect(res.status).toBe(400);
  });

  test('con datos válidos, edita el usuario y responde 200', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'otro-uuid', nombre: 'Beatriz Editada', email: 'b@ferrecontrol.com', rol: 'Vendedor', estado: 'Activo' }] });

    const res = await request(app)
      .put('/api/usuarios/otro-uuid')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .set('Cookie', 'csrfToken=test-csrf').set('X-CSRF-Token', 'test-csrf')
      .send({ nombre: 'Beatriz Editada', email: 'b@ferrecontrol.com', rol: 'Vendedor', estado: 'Activo' });

    expect(res.status).toBe(200);
    expect(res.body.nombre).toBe('Beatriz Editada');
  });

  test('responde 404 si el usuario no existe', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .put('/api/usuarios/no-existe')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .set('Cookie', 'csrfToken=test-csrf').set('X-CSRF-Token', 'test-csrf')
      .send({ nombre: 'X', email: 'x@ferrecontrol.com' });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/usuarios/:id', () => {
  test('rechaza con 403 si el rol no es Administrador', async () => {
    const res = await request(app)
      .delete('/api/usuarios/otro-uuid')
      .set('Authorization', `Bearer ${tokenVendedor}`)
      .set('Cookie', 'csrfToken=test-csrf').set('X-CSRF-Token', 'test-csrf');

    expect(res.status).toBe(403);
  });

  test('un Administrador NO puede eliminar su propia cuenta (protección de auto-eliminación)', async () => {
    const res = await request(app)
      .delete(`/api/usuarios/${ADMIN_ID}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .set('Cookie', 'csrfToken=test-csrf').set('X-CSRF-Token', 'test-csrf');

    expect(res.status).toBe(400);
    expect(mockPool.query).not.toHaveBeenCalled(); // ni siquiera debe intentar tocar la BD
  });

  test('un Administrador sí puede eliminar la cuenta de otro usuario', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'otro-uuid', nombre: 'Carlos' }] });

    const res = await request(app)
      .delete('/api/usuarios/otro-uuid')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .set('Cookie', 'csrfToken=test-csrf').set('X-CSRF-Token', 'test-csrf');

    expect(res.status).toBe(200);
  });

  test('rechaza con 409 si el usuario tiene movimientos o auditoría asociados', async () => {
    const errorFK = new Error('foreign key violation');
    errorFK.code = '23503';
    mockPool.query.mockRejectedValueOnce(errorFK);

    const res = await request(app)
      .delete('/api/usuarios/otro-uuid')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .set('Cookie', 'csrfToken=test-csrf').set('X-CSRF-Token', 'test-csrf');

    expect(res.status).toBe(409);
  });
});
