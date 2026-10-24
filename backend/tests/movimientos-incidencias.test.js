// tests/movimientos-incidencias.test.js
// Pruebas escritas para detectar posibles defectos en POST /api/movimientos
// (AA3-EV01). Se ejecutan con la base de datos simulada, igual que
// movimientos.test.js.

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

const enviar = (cuerpo) =>
  request(app)
    .post('/api/movimientos')
    .set('Authorization', `Bearer ${token}`)
    .set('Cookie', 'csrfToken=test-csrf').set('X-CSRF-Token', 'test-csrf')
    .send(cuerpo);

describe('POST /api/movimientos - incidencias detectadas (AA3)', () => {
  beforeEach(() => {
    mockClient.query.mockReset();
    mockClient.release.mockReset();
  });

  test('INC-001: una Entrada de un producto que no existe responde 404 (no 500)', async () => {
    const errorFK = Object.assign(new Error('violación de llave foránea'), { code: '23503' });
    mockClient.query
      .mockResolvedValueOnce(undefined)   // BEGIN
      .mockRejectedValueOnce(errorFK)     // INSERT falla: el producto no existe
      .mockResolvedValueOnce(undefined);  // ROLLBACK

    const res = await enviar({ producto_id: 'FER-999', tipo_movimiento: 'Entrada', cantidad: 5 });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/Producto no encontrado/);
  });

  test('INC-002: un tipo de movimiento distinto de Entrada o Salida se rechaza con 400', async () => {
    const res = await enviar({ producto_id: 'FER-001', tipo_movimiento: 'Ajuste', cantidad: 10 });

    expect(res.status).toBe(400);
    expect(mockClient.query).not.toHaveBeenCalled(); // nunca debe tocar la base de datos
  });

  test.each([['abc'], [2.5]])('INC-003: una cantidad no entera (%p) se rechaza con 400', async (cantidad) => {
    const res = await enviar({ producto_id: 'FER-001', tipo_movimiento: 'Entrada', cantidad });

    expect(res.status).toBe(400);
    expect(mockClient.query).not.toHaveBeenCalled();
  });
});