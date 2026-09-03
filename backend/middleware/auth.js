// ==============================================================================
// MIDDLEWARE DE AUTENTICACIÓN
// Antes: el token viajaba en el header Authorization y el frontend lo
// guardaba en localStorage — funcional, pero localStorage es legible por
// cualquier script que corra en la página, así que un XSS (aunque hoy no
// tengamos ninguno conocido) podría robarlo. Ahora el frontend recibe el
// token en una cookie httpOnly (invisible para JavaScript) y este
// middleware la lee de ahí. Se sigue aceptando también el header
// Authorization, solo para no reescribir las 30 pruebas automatizadas
// existentes (que construyen el token directamente, sin pasar por login).
// ==============================================================================
const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const tokenFromHeader = authHeader && authHeader.split(' ')[1]; // "Bearer <token>"
    const tokenFromCookie = req.cookies && req.cookies.token;
    const token = tokenFromCookie || tokenFromHeader;

    if (!token) {
        return res.status(401).json({ error: 'Token no proporcionado. Inicia sesión de nuevo.' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ error: 'Token inválido o expirado. Inicia sesión de nuevo.' });
        }
        req.user = decoded; // { id, nombre, email, rol }
        next();
    });
}

// Middleware adicional: solo deja pasar si el rol coincide
function requireRole(...rolesPermitidos) {
    return (req, res, next) => {
        if (!req.user || !rolesPermitidos.includes(req.user.rol)) {
            return res.status(403).json({ error: 'No tienes permisos para realizar esta acción.' });
        }
        next();
    };
}

// Protección CSRF (patrón "doble envío"): la cookie del token es httpOnly
// (JS no la puede leer), pero eso por sí solo no evita que un sitio malicioso
// haga que el navegador de la víctima mande una petición aprovechando la
// cookie automáticamente. Por eso el login también entrega una segunda
// cookie NO-httpOnly con un valor aleatorio (csrfToken); el frontend debe
// leerla y reenviarla en un header en cada petición que modifique datos.
// Si el header no coincide con la cookie, la petición se rechaza.
function verifyCsrf(req, res, next) {
    const metodosProtegidos = ['POST', 'PUT', 'DELETE'];
    const rutasExentas = ['/api/auth/login']; // aquí es donde se obtienen las cookies por primera vez
    if (!metodosProtegidos.includes(req.method) || rutasExentas.includes(req.path)) {
        return next();
    }
    const cookieCsrf = req.cookies && req.cookies.csrfToken;
    const headerCsrf = req.headers['x-csrf-token'];
    if (!cookieCsrf || !headerCsrf || cookieCsrf !== headerCsrf) {
        return res.status(403).json({ error: 'Token CSRF inválido o ausente.' });
    }
    next();
}

module.exports = { verifyToken, requireRole, verifyCsrf };
