// tests/auditoria.test.js
process.env.JWT_SECRET = 'secreto_de_prueba_no_usar_en_produccion';
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgres://fake-solo-para-pruebas';

const mockPool = { query: jest.fn().mockResolvedValue({ rows: [] }), connect: jest.fn().mockResolvedValue({ release: jest.fn() }) };
jest.mock('pg', () => ({ Pool: jest.fn(() => mockPool) }));

const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../server');

const tokenAdmin = jwt.sign({ id: 1, nombre: 'Admin', email: 'admin@ferrecontrol.com', rol: 'Administrador' }, process.env.JWT_SECRET);
const tokenVendedor = jwt.sign({ id: 2, nombre: 'Vendedor', email: 'v@ferrecontrol.com', rol: 'Vendedor' }, process.env.JWT_SECRET);

beforeEach(() => {
  mockPool.query.mockClear();
  mockPool.query.mockResolvedValue({ rows: [] });
});

describe('GET /api/auditoria', () => {
  test('rechaza con 401 sin token', async () => {
    const res = await request(app).get('/api/auditoria');
    expect(res.status).toBe(401);
  });

  test('rechaza con 403 si el rol no es Administrador', async () => {
    const res = await request(app).get('/api/auditoria').set('Authorization', `Bearer ${tokenVendedor}`);
    expect(res.status).toBe(403);
  });

  test('con token de Administrador, devuelve el historial que entregue la base de datos', async () => {
    mockPool.query.mockResolvedValueOnce({
      rows: [{ id: 1, usuario: 'Admin', accion: 'Creó', entidad: 'Producto', detalle: 'Martillo Stanley', ip: '::1', fecha: '2026-08-03' }],
    });

    const res = await request(app).get('/api/auditoria').set('Authorization', `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(res.body[0].accion).toBe('Creó');
  });
});

describe('registro automático de auditoría al crear un producto', () => {
  test('POST /api/productos exitoso dispara un INSERT INTO auditoria además del INSERT del producto', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'FER-020', nombre: 'Nivel de burbuja' }] }); // INSERT productos

    const res = await request(app)
      .post('/api/productos')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .set('Cookie', 'csrfToken=test-csrf').set('X-CSRF-Token', 'test-csrf')
      .send({ id: 'FER-020', nombre: 'Nivel de burbuja', precio_venta: 15000 });

    expect(res.status).toBe(201);

    // Espera un ciclo de microtareas: registrarAuditoria es "fire and
    // forget" (no se espera con await dentro de la ruta), así que la
    // llamada a db.query para el INSERT de auditoría puede ocurrir justo
    // después de que la respuesta ya se envió.
    await new Promise((resolve) => setImmediate(resolve));

    const llamadas = mockPool.query.mock.calls.map((call) => call[0]);
    expect(llamadas.some((sql) => sql.includes('INSERT INTO auditoria'))).toBe(true);
  });
});
