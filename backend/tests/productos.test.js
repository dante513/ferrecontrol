// tests/productos.test.js
process.env.JWT_SECRET = 'secreto_de_prueba_no_usar_en_produccion';
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgres://fake-solo-para-pruebas';

const mockClient = { query: jest.fn(), release: jest.fn() };
const mockPool = { query: jest.fn().mockResolvedValue({ rows: [] }), connect: jest.fn().mockResolvedValue(mockClient) };
jest.mock('pg', () => ({ Pool: jest.fn(() => mockPool) }));

const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../server');

const tokenAdmin = jwt.sign({ id: 1, nombre: 'Admin', email: 'admin@ferrecontrol.com', rol: 'Administrador' }, process.env.JWT_SECRET);
const tokenVendedor = jwt.sign({ id: 2, nombre: 'Vendedor', email: 'v@ferrecontrol.com', rol: 'Vendedor' }, process.env.JWT_SECRET);

beforeEach(() => {
  mockPool.query.mockClear();
  mockPool.query.mockResolvedValue({ rows: [] }); // valor por defecto para llamadas no especificadas (ej. la auditoría)
  mockClient.query.mockReset();
  mockClient.release.mockClear();
});

describe('GET /api/productos', () => {
  test('rechaza con 401 sin token', async () => {
    const res = await request(app).get('/api/productos');
    expect(res.status).toBe(401);
  });

  test('con token válido, devuelve la lista que entregue la base de datos', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'FER-001', nombre: 'Martillo' }] });
    const res = await request(app).get('/api/productos').set('Authorization', `Bearer ${tokenAdmin}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: 'FER-001', nombre: 'Martillo' }]);
  });
});

describe('POST /api/productos', () => {
  test('rechaza con 400 si falta el nombre (sin llegar a consultar la BD)', async () => {
    const res = await request(app)
      .post('/api/productos')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .set('Cookie', 'csrfToken=test-csrf').set('X-CSRF-Token', 'test-csrf')
      .send({ id: 'FER-010', precio_venta: 1000 });

    expect(res.status).toBe(400);
    expect(mockPool.query).not.toHaveBeenCalled();
  });

  test('rechaza con 400 si el precio es 0 (la validación no distingue si el campo vino o no)', async () => {
    const res = await request(app)
      .post('/api/productos')
      .set('Authorization', `Bearer ${tokenVendedor}`)
      .set('Cookie', 'csrfToken=test-csrf').set('X-CSRF-Token', 'test-csrf')
      .send({ id: 'FER-011', nombre: 'Tornillo', precio_venta: 0 });

    expect(res.status).toBe(400);
    expect(mockPool.query).not.toHaveBeenCalled();
  });

  test('rechaza con 409 si el código ya existe (violación de llave primaria simulada)', async () => {
    const errorDuplicado = new Error('duplicate key value violates unique constraint');
    errorDuplicado.code = '23505';
    mockPool.query.mockRejectedValueOnce(errorDuplicado);

    const res = await request(app)
      .post('/api/productos')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .set('Cookie', 'csrfToken=test-csrf').set('X-CSRF-Token', 'test-csrf')
      .send({ id: 'FER-001', nombre: 'Martillo Duplicado', precio_venta: 5000 });

    expect(res.status).toBe(409);
  });

  test('con datos válidos crea el producto y responde 201', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'FER-012', nombre: 'Serrucho', precio_venta: 20000 }] });

    const res = await request(app)
      .post('/api/productos')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .set('Cookie', 'csrfToken=test-csrf').set('X-CSRF-Token', 'test-csrf')
      .send({ id: 'FER-012', nombre: 'Serrucho', precio_venta: 20000, unidad_medida: 'Unidad' });

    expect(res.status).toBe(201);
    expect(res.body.id).toBe('FER-012');
  });
});

describe('PUT /api/productos/:id — regla de negocio: solo Administrador cambia el precio', () => {
  test('un Vendedor puede editar el producto: pasa por una transacción con SET LOCAL ROLE, y precio_venta nunca aparece en el SQL', async () => {
    mockClient.query
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockResolvedValueOnce(undefined) // SET LOCAL ROLE ferrecontrol_vendedor
      .mockResolvedValueOnce({ rows: [{ id: 'FER-001', nombre: 'Taladro Editado', precio_venta: 350000 }] }) // UPDATE
      .mockResolvedValueOnce(undefined); // COMMIT

    const res = await request(app)
      .put('/api/productos/FER-001')
      .set('Authorization', `Bearer ${tokenVendedor}`)
      .set('Cookie', 'csrfToken=test-csrf').set('X-CSRF-Token', 'test-csrf')
      .send({ nombre: 'Taladro Editado', precio_venta: 1, unidad_medida: 'Unidad' }); // intenta poner precio en $1

    expect(res.status).toBe(200);
    expect(mockClient.query).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(mockClient.query).toHaveBeenNthCalledWith(2, 'SET LOCAL ROLE ferrecontrol_vendedor');
    expect(mockClient.query).toHaveBeenNthCalledWith(4, 'COMMIT');

    // El SQL del UPDATE (la 3ra llamada) nunca debe mencionar precio_venta:
    const updateSql = mockClient.query.mock.calls[2][0];
    expect(updateSql).not.toMatch(/precio_venta/);
    expect(mockClient.release).toHaveBeenCalled();
  });

  test('un Administrador sí puede cambiar el precio (usa la conexión normal, sin cambiar de rol)', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'FER-001', nombre: 'Taladro', precio_venta: 400000 }] });

    const res = await request(app)
      .put('/api/productos/FER-001')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .set('Cookie', 'csrfToken=test-csrf').set('X-CSRF-Token', 'test-csrf')
      .send({ nombre: 'Taladro', precio_venta: 400000, unidad_medida: 'Unidad' });

    expect(res.status).toBe(200);
    expect(res.body.precio_venta).toBe(400000);
    // Como es Administrador, no debería haber abierto ninguna transacción con cambio de rol:
    expect(mockClient.query).not.toHaveBeenCalled();
  });

  test('rechaza con 400 si el Administrador manda un precio inválido', async () => {
    const res = await request(app)
      .put('/api/productos/FER-001')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .set('Cookie', 'csrfToken=test-csrf').set('X-CSRF-Token', 'test-csrf')
      .send({ nombre: 'Taladro', precio_venta: 0, unidad_medida: 'Unidad' });

    expect(res.status).toBe(400);
  });

  test('rechaza con 400 si falta el nombre', async () => {
    const res = await request(app)
      .put('/api/productos/FER-001')
      .set('Authorization', `Bearer ${tokenVendedor}`)
      .set('Cookie', 'csrfToken=test-csrf').set('X-CSRF-Token', 'test-csrf')
      .send({ unidad_medida: 'Unidad' });

    expect(res.status).toBe(400);
  });

  test('responde 404 si el producto no existe (caso Vendedor) y hace ROLLBACK', async () => {
    mockClient.query
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockResolvedValueOnce(undefined) // SET LOCAL ROLE
      .mockResolvedValueOnce({ rows: [] }) // UPDATE no encuentra el producto
      .mockResolvedValueOnce(undefined); // ROLLBACK

    const res = await request(app)
      .put('/api/productos/FER-999')
      .set('Authorization', `Bearer ${tokenVendedor}`)
      .set('Cookie', 'csrfToken=test-csrf').set('X-CSRF-Token', 'test-csrf')
      .send({ nombre: 'No existe', unidad_medida: 'Unidad' });

    expect(res.status).toBe(404);
    expect(mockClient.query).toHaveBeenNthCalledWith(4, 'ROLLBACK');
  });
});
