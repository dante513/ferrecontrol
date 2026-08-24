// tests/movimientos.test.js
// El endpoint de movimientos usa una transacción (BEGIN/COMMIT/ROLLBACK) a
// través de db.connect(), no de db.query() directo — por eso el mock aquí
// simula un "cliente" de conexión con su propio método query(), en la
// misma secuencia en que la ruta real lo llama.

process.env.JWT_SECRET = 'secreto_de_prueba_no_usar_en_produccion';
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgres://fake-solo-para-pruebas';

const mockClient = { query: jest.fn(), release: jest.fn() };
const mockPool = { query: jest.fn().mockResolvedValue({ rows: [] }), connect: jest.fn(() => Promise.resolve(mockClient)) };
jest.mock('pg', () => ({ Pool: jest.fn(() => mockPool) }));

const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../server');

const token = jwt.sign({ id: 1, nombre: 'Admin', email: 'admin@ferrecontrol.com', rol: 'Administrador' }, process.env.JWT_SECRET);

describe('POST /api/movimientos', () => {
  beforeEach(() => {
    mockClient.query.mockReset();
    mockClient.release.mockReset();
  });

  test('rechaza con 400 si faltan campos, sin abrir ninguna conexión/transacción', async () => {
    const res = await request(app)
      .post('/api/movimientos')
      .set('Authorization', `Bearer ${token}`)
      .send({ tipo_movimiento: 'Entrada' }); // falta producto_id y cantidad

    expect(res.status).toBe(400);
    expect(mockClient.query).not.toHaveBeenCalled();
  });

  test('rechaza con 400 si la cantidad es 0 o negativa', async () => {
    const res = await request(app)
      .post('/api/movimientos')
      .set('Authorization', `Bearer ${token}`)
      .send({ producto_id: 'FER-001', tipo_movimiento: 'Salida', cantidad: -5 });

    expect(res.status).toBe(400);
  });

  test('una Salida mayor al stock disponible se rechaza con 400 y hace ROLLBACK, sin insertar el movimiento', async () => {
    mockClient.query
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockResolvedValueOnce({ rows: [{ stock_actual: 3 }] }) // SELECT stock_actual
      .mockResolvedValueOnce(undefined); // ROLLBACK

    const res = await request(app)
      .post('/api/movimientos')
      .set('Authorization', `Bearer ${token}`)
      .send({ producto_id: 'FER-001', tipo_movimiento: 'Salida', cantidad: 10 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Stock insuficiente/);
    expect(mockClient.query).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(mockClient.query).toHaveBeenNthCalledWith(3, 'ROLLBACK');
    // Nunca debe llegar a intentar el INSERT del movimiento:
    const llamadas = mockClient.query.mock.calls.map((call) => call[0]);
    expect(llamadas.some((sql) => sql.includes('INSERT INTO movimientos'))).toBe(false);
    expect(mockClient.release).toHaveBeenCalled(); // la conexión se libera incluso si falla
  });

  test('una Entrada válida hace BEGIN, INSERT, UPDATE y COMMIT, y responde 201', async () => {
    mockClient.query
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockResolvedValueOnce(undefined) // INSERT INTO movimientos
      .mockResolvedValueOnce(undefined) // UPDATE productos
      .mockResolvedValueOnce(undefined); // COMMIT

    const res = await request(app)
      .post('/api/movimientos')
      .set('Authorization', `Bearer ${token}`)
      .send({ producto_id: 'FER-001', tipo_movimiento: 'Entrada', cantidad: 20, motivo: 'Compra a proveedor' });

    expect(res.status).toBe(201);
    expect(mockClient.query).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(mockClient.query).toHaveBeenNthCalledWith(4, 'COMMIT');
    expect(mockClient.release).toHaveBeenCalled();
  });

  test('una Salida con stock suficiente sí se procesa (no se confunde con el caso insuficiente)', async () => {
    mockClient.query
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockResolvedValueOnce({ rows: [{ stock_actual: 50 }] }) // SELECT stock_actual
      .mockResolvedValueOnce(undefined) // INSERT
      .mockResolvedValueOnce(undefined) // UPDATE
      .mockResolvedValueOnce(undefined); // COMMIT

    const res = await request(app)
      .post('/api/movimientos')
      .set('Authorization', `Bearer ${token}`)
      .send({ producto_id: 'FER-001', tipo_movimiento: 'Salida', cantidad: 5 });

    expect(res.status).toBe(201);
  });
});
