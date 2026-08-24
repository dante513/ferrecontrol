// tests/middleware.test.js
// Pruebas unitarias puras del middleware de autenticación: no dependen de
// la base de datos ni de Express, solo llaman las funciones directamente
// con objetos req/res/next simulados. Por eso no hace falta mockear 'pg'.

process.env.JWT_SECRET = 'secreto_de_prueba_no_usar_en_produccion';

const jwt = require('jsonwebtoken');
const { verifyToken, requireRole } = require('../middleware/auth');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('middleware verifyToken', () => {
  test('rechaza la petición si no viene ningún token', () => {
    const req = { headers: {} };
    const res = mockRes();
    const next = jest.fn();

    verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('rechaza un token inválido o corrupto', () => {
    const req = { headers: { authorization: 'Bearer token-invalido' } };
    const res = mockRes();
    const next = jest.fn();

    verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('deja pasar un token válido y adjunta el usuario decodificado a req.user', () => {
    const token = jwt.sign({ id: 1, nombre: 'Ana', rol: 'Administrador' }, process.env.JWT_SECRET);
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    const next = jest.fn();

    verifyToken(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user.rol).toBe('Administrador');
  });
});

describe('middleware requireRole', () => {
  test('bloquea con 403 si el rol del usuario no está en la lista permitida', () => {
    const req = { user: { rol: 'Vendedor' } };
    const res = mockRes();
    const next = jest.fn();

    requireRole('Administrador')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('deja pasar si el rol sí está permitido', () => {
    const req = { user: { rol: 'Administrador' } };
    const res = mockRes();
    const next = jest.fn();

    requireRole('Administrador', 'Vendedor')(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
