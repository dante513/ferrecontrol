// tests/seguridad.test.js
// Suite dedicada a simular intentos de ataque comunes contra la API,
// distinta de las pruebas de "flujo normal" de los otros archivos. Aquí
// no se prueba que el sistema funcione bien con datos correctos, sino que
// SIGA funcionando bien (o rechace de forma segura) cuando alguien manda
// datos maliciosos a propósito.

process.env.JWT_SECRET = 'secreto_de_prueba_no_usar_en_produccion';
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgres://fake-solo-para-pruebas';

const mockClient = { query: jest.fn(), release: jest.fn() };
const mockPool = { query: jest.fn().mockResolvedValue({ rows: [] }), connect: jest.fn().mockResolvedValue(mockClient) };
jest.mock('pg', () => ({ Pool: jest.fn(() => mockPool) }));

const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../server');

const tokenAdmin = jwt.sign({ id: 'admin-uuid', nombre: 'Admin', email: 'admin@ferrecontrol.com', rol: 'Administrador' }, process.env.JWT_SECRET);
const tokenVendedor = jwt.sign({ id: 'vendedor-uuid', nombre: 'Vendedor', email: 'v@ferrecontrol.com', rol: 'Vendedor' }, process.env.JWT_SECRET);
const CSRF = { Cookie: 'csrfToken=test-csrf', 'X-CSRF-Token': 'test-csrf' };

beforeEach(() => {
  mockPool.query.mockClear();
  mockPool.query.mockResolvedValue({ rows: [] });
  mockClient.query.mockReset();
  mockClient.release.mockClear();
});

describe('Inyección SQL', () => {
  test('un intento de SQLi clásico en el correo de login no rompe la consulta ni entrega acceso', async () => {
    const payload = "' OR '1'='1";
    mockPool.query.mockResolvedValueOnce({ rows: [] }); // ninguna fila coincide con ese texto literal

    const res = await request(app).post('/api/auth/login').send({ email: payload, password: 'x' });

    expect(res.status).toBe(401);
    // La consulta debe seguir siendo parametrizada: el payload va como
    // VALOR del parámetro, nunca concatenado dentro del texto SQL.
    const [sql, params] = mockPool.query.mock.calls[0];
    expect(sql).not.toContain(payload);
    expect(params).toContain(payload);
  });

  test('un intento de SQLi en el ID de un producto (ej. en la URL) no provoca un error 500, solo un 404 normal', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] });

    const payloadId = encodeURIComponent("FER-001'; DROP TABLE productos;--");
    const res = await request(app)
      .delete(`/api/productos/${payloadId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .set(CSRF);

    // No debe haber una tabla borrada ni un 500 — solo "no encontrado",
    // porque el id viajó como parámetro, nunca como texto SQL ejecutable.
    expect(res.status).toBe(404);
  });
});

describe('Autenticación y tokens', () => {
  test('un token firmado con una clave distinta a la del servidor se rechaza (no se puede falsificar sin conocer el secreto)', async () => {
    const tokenFalso = jwt.sign({ id: 'x', rol: 'Administrador' }, 'clave-incorrecta-inventada');

    const res = await request(app).get('/api/productos').set('Authorization', `Bearer ${tokenFalso}`);

    expect(res.status).toBe(403);
  });

  test('un token expirado se rechaza', async () => {
    const tokenExpirado = jwt.sign({ id: 'x', rol: 'Administrador' }, process.env.JWT_SECRET, { expiresIn: -10 });

    const res = await request(app).get('/api/productos').set('Authorization', `Bearer ${tokenExpirado}`);

    expect(res.status).toBe(403);
  });

  test('un token válido pero SIN rol no pasa un requireRole (ej. token manipulado a mano sin firmar de nuevo)', async () => {
    const tokenSinRol = jwt.sign({ id: 'x' }, process.env.JWT_SECRET); // sin campo "rol"

    const res = await request(app).get('/api/proveedores').set('Authorization', `Bearer ${tokenSinRol}`);

    expect(res.status).toBe(403);
  });
});

describe('Escalación de privilegios', () => {
  test('un Vendedor no puede leer la lista de usuarios aunque conozca la ruta exacta', async () => {
    const res = await request(app).get('/api/usuarios').set('Authorization', `Bearer ${tokenVendedor}`);
    expect(res.status).toBe(403);
  });

  test('un Vendedor no puede eliminar un proveedor', async () => {
    const res = await request(app)
      .delete('/api/proveedores/algun-id')
      .set('Authorization', `Bearer ${tokenVendedor}`)
      .set(CSRF);
    expect(res.status).toBe(403);
  });

  test('un Vendedor no puede crear otro usuario (ej. crearse a sí mismo como Administrador)', async () => {
    const res = await request(app)
      .post('/api/usuarios')
      .set('Authorization', `Bearer ${tokenVendedor}`)
      .set(CSRF)
      .send({ nombre: 'Intruso', email: 'intruso@ferrecontrol.com', password: 'clave12345', rol: 'Administrador' });
    expect(res.status).toBe(403);
  });
});

describe('CSRF', () => {
  test('una petición autenticada que modifica datos, sin el header CSRF, se rechaza aunque el token de sesión sea válido', async () => {
    const res = await request(app)
      .post('/api/productos')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      // a propósito no se manda el header X-CSRF-Token
      .send({ id: 'FER-099', nombre: 'Intento sin CSRF', precio_venta: 1000 });

    expect(res.status).toBe(403);
  });

  test('si el header CSRF no coincide con la cookie, también se rechaza (no basta con mandar cualquier valor)', async () => {
    const res = await request(app)
      .post('/api/productos')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .set('Cookie', 'csrfToken=valor-real')
      .set('X-CSRF-Token', 'valor-inventado-distinto')
      .send({ id: 'FER-099', nombre: 'Intento CSRF no coincide', precio_venta: 1000 });

    expect(res.status).toBe(403);
  });
});

describe('Payloads maliciosos / datos fuera de rango', () => {
  test('un cuerpo de petición absurdamente grande se rechaza antes de llegar a la lógica de negocio', async () => {
    const nombreGigante = 'A'.repeat(200000); // ~200 KB, supera el límite por defecto de express.json (100kb)

    const res = await request(app)
      .post('/api/productos')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .set(CSRF)
      .send({ id: 'FER-098', nombre: nombreGigante, precio_venta: 1000 });

    expect([400, 413]).toContain(res.status); // Express corta esto antes de que la ruta se ejecute
  });

  test('una cantidad negativa disfrazada de número válido no genera stock "infinito" en un movimiento', async () => {
    const res = await request(app)
      .post('/api/movimientos')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .set(CSRF)
      .send({ producto_id: 'FER-001', tipo_movimiento: 'Entrada', cantidad: -999999 });

    expect(res.status).toBe(400);
    expect(mockClient.query).not.toHaveBeenCalled(); // ni siquiera abre la transacción
  });

  test('un payload con HTML/JavaScript incrustado se guarda como texto plano, sin romper el servidor', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'FER-097', nombre: '<script>alert(1)</script>' }] });

    const res = await request(app)
      .post('/api/productos')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .set(CSRF)
      .send({ id: 'FER-097', nombre: '<script>alert(1)</script>', precio_venta: 1000 });

    // El backend no tiene por qué "ejecutar" ni interpretar esto — solo
    // guardarlo como cualquier otro texto. La responsabilidad de no
    // renderizarlo como HTML es del frontend (React ya lo escapa
    // automáticamente, verificado en el análisis de seguridad del proyecto).
    expect(res.status).toBe(201);
  });
});
