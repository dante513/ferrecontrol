// ==============================================================================
// MIDDLEWARE DE AUTENTICACIÓN
// Verifica el token JWT enviado en el header Authorization: Bearer <token>
// ==============================================================================
const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // "Bearer <token>"

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

module.exports = { verifyToken, requireRole };
