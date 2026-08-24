// ==============================================================================
// SERVIDOR BACKEND - FERRÉ CONTROL
// Punto de entrada de la API REST
// ==============================================================================

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
require('dotenv').config();
const { verifyToken, requireRole } = require('./middleware/auth');
const { registrarAuditoria } = require('./middleware/audit');

const app = express();
const PORT = process.env.PORT || 5000;

// --- Middlewares ---
app.use(helmet());
app.use(cors({
    // Antes: 'origin: process.env.FRONTEND_URL || "*"'.
    // Con '*' como fallback, si alguien olvidaba definir FRONTEND_URL en
    // producción, la API aceptaba peticiones de cualquier origen sin darse
    // cuenta. Ahora el fallback es localhost (solo útil en desarrollo) —
    // así, olvidar la variable en producción rompe visiblemente el CORS
    // en vez de dejarlo abierto en silencio.
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Límite general para toda la API (protege contra scraping o abuso masivo
// con un token válido): 300 peticiones cada 15 minutos, por IP.
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    message: { error: 'Demasiadas peticiones. Intenta de nuevo en unos minutos.' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// Limita los intentos de login para dificultar ataques de fuerza bruta
// (10 intentos cada 15 minutos, por IP).
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en unos minutos.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// --- Conexión a la Base de Datos ---
const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

db.connect()
    .then(() => console.log('✅ Conexión a la Base de Datos exitosa'))
    .catch(err => console.error('❌ Error conectando a la BD:', err.stack));

// ==============================================================================
// RUTAS - DIAGNÓSTICO
// ==============================================================================
app.get('/api/health', (req, res) => {
    res.json({ estado: 'Ok', mensaje: 'Servidor de Ferré Control funcionando correctamente' });
});

// ==============================================================================
// RUTAS - AUTENTICACIÓN
// ==============================================================================
app.post('/api/auth/login', loginLimiter, async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Correo y contraseña son obligatorios.' });
    }

    try {
        const result = await db.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        const usuario = result.rows[0];

        // Mensaje genérico a propósito: no revelar si falló el correo o la contraseña
        if (!usuario) {
            return res.status(401).json({ error: 'Credenciales incorrectas.' });
        }
        if (usuario.estado !== 'Activo') {
            return res.status(403).json({ error: 'Este usuario está inactivo. Contacta al administrador.' });
        }

        const passwordValida = await bcrypt.compare(password, usuario.password_hash);
        if (!passwordValida) {
            return res.status(401).json({ error: 'Credenciales incorrectas.' });
        }

        const token = jwt.sign(
            { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        registrarAuditoria(db, {
            usuario_id: usuario.id,
            accion: 'Inició sesión',
            entidad: 'Sesión',
            detalle: usuario.email,
            ip: req.ip,
        });

        res.json({
            token,
            usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol }
        });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Ruta para que el frontend valide si el token sigue vigente al recargar la página
app.get('/api/auth/me', verifyToken, (req, res) => {
    res.json({ usuario: req.user });
});

// Permite que el usuario autenticado cambie su propia contraseña.
// Exige la contraseña actual para evitar que alguien con una sesión abierta
// (pero sin saber la contraseña real) pueda tomar control total de la cuenta.
app.post('/api/auth/change-password', verifyToken, loginLimiter, async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Debes indicar la contraseña actual y la nueva.' });
    }
    if (newPassword.length < 8) {
        return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres.' });
    }

    try {
        const result = await db.query('SELECT password_hash FROM usuarios WHERE id = $1', [req.user.id]);
        const usuario = result.rows[0];
        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }

        const actualValida = await bcrypt.compare(currentPassword, usuario.password_hash);
        if (!actualValida) {
            return res.status(401).json({ error: 'La contraseña actual no es correcta.' });
        }

        const nuevoHash = await bcrypt.hash(newPassword, 10);
        await db.query('UPDATE usuarios SET password_hash = $1 WHERE id = $2', [nuevoHash, req.user.id]);

        res.json({ mensaje: 'Contraseña actualizada correctamente.' });
    } catch (error) {
        console.error('Error al cambiar contraseña:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// ==============================================================================
// RUTAS - CATEGORÍAS (solo lectura, para llenar selects de formularios)
// ==============================================================================
app.get('/api/categorias', verifyToken, async (req, res) => {
    try {
        const result = await db.query('SELECT id, nombre, descripcion FROM categorias ORDER BY nombre ASC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener categorías:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Crear/eliminar categorías es exclusivo de Administrador: cambia cómo se
// clasifica TODO el catálogo, no es una operación del día a día.
app.post('/api/categorias', verifyToken, requireRole('Administrador'), async (req, res) => {
    const { nombre, descripcion } = req.body;
    if (!nombre) {
        return res.status(400).json({ error: 'El nombre de la categoría es obligatorio.' });
    }
    try {
        const result = await db.query(
            'INSERT INTO categorias (nombre, descripcion) VALUES ($1, $2) RETURNING *',
            [nombre, descripcion || null]
        );
        registrarAuditoria(db, { usuario_id: req.user.id, accion: 'Creó', entidad: 'Categoría', entidad_id: String(result.rows[0].id), detalle: nombre, ip: req.ip });
        res.status(201).json(result.rows[0]);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ error: `Ya existe una categoría llamada "${nombre}".` });
        }
        console.error('Error al crear categoría:', error);
        res.status(500).json({ error: 'Error al registrar la categoría' });
    }
});

// Si hay productos usando la categoría, la base de datos rechaza el borrado
// (llave foránea en productos.categoria_id) — hay que reasignarlos primero.
app.delete('/api/categorias/:id', verifyToken, requireRole('Administrador'), async (req, res) => {
    try {
        const result = await db.query('DELETE FROM categorias WHERE id = $1 RETURNING id', [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Categoría no encontrada' });
        }
        registrarAuditoria(db, { usuario_id: req.user.id, accion: 'Eliminó', entidad: 'Categoría', entidad_id: req.params.id, ip: req.ip });
        res.json({ mensaje: 'Categoría eliminada correctamente' });
    } catch (error) {
        if (error.code === '23503') {
            return res.status(409).json({ error: 'No se puede eliminar: hay productos usando esta categoría.' });
        }
        console.error('Error al eliminar categoría:', error);
        res.status(500).json({ error: 'Error al eliminar la categoría' });
    }
});

app.put('/api/categorias/:id', verifyToken, requireRole('Administrador'), async (req, res) => {
    const { nombre, descripcion } = req.body;
    if (!nombre) {
        return res.status(400).json({ error: 'El nombre de la categoría es obligatorio.' });
    }
    try {
        const result = await db.query(
            'UPDATE categorias SET nombre = $1, descripcion = $2 WHERE id = $3 RETURNING *',
            [nombre, descripcion || null, req.params.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Categoría no encontrada' });
        }
        registrarAuditoria(db, { usuario_id: req.user.id, accion: 'Editó', entidad: 'Categoría', entidad_id: req.params.id, detalle: nombre, ip: req.ip });
        res.json(result.rows[0]);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ error: `Ya existe una categoría llamada "${nombre}".` });
        }
        console.error('Error al editar categoría:', error);
        res.status(500).json({ error: 'Error al editar la categoría' });
    }
});

// ==============================================================================
// RUTAS - PRODUCTOS
// ==============================================================================
app.get('/api/productos', verifyToken, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT p.*, c.nombre AS categoria, prov.nombre AS proveedor
            FROM productos p
            LEFT JOIN categorias c ON p.categoria_id = c.id
            LEFT JOIN proveedores prov ON p.proveedor_id = prov.id
            ORDER BY p.stock_actual ASC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener productos:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.post('/api/productos', verifyToken, async (req, res) => {
    const { id, nombre, categoria_id, proveedor_id, unidad_medida, precio_venta, ubicacion, stock_actual, stock_minimo } = req.body;

    if (!id || !nombre) {
        return res.status(400).json({ error: 'El código (id) y el nombre son obligatorios' });
    }
    // Antes esta validación solo corría si precio_venta venía en el body,
    // así que omitirlo dejaba guardar un producto con precio 0 sin avisar.
    if (!precio_venta || Number(precio_venta) <= 0) {
        return res.status(400).json({ error: 'El precio debe ser mayor a 0' });
    }

    try {
        const result = await db.query(`
            INSERT INTO productos (id, nombre, categoria_id, proveedor_id, unidad_medida, precio_venta, ubicacion, stock_actual, stock_minimo)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `, [id, nombre, categoria_id || null, proveedor_id || null, unidad_medida, precio_venta, ubicacion, stock_actual || 0, stock_minimo || 5]);
        registrarAuditoria(db, { usuario_id: req.user.id, accion: 'Creó', entidad: 'Producto', entidad_id: id, detalle: nombre, ip: req.ip });
        res.status(201).json(result.rows[0]);
    } catch (error) {
        if (error.code === '23505') { // violación de llave primaria (código duplicado)
            return res.status(409).json({ error: `Ya existe un producto con el código ${id}.` });
        }
        console.error('Error al crear producto:', error);
        res.status(500).json({ error: 'Error al registrar el producto' });
    }
});

// Eliminar un producto. Solo Administrador, porque borrar del catálogo
// afecta a todo el equipo, no es una operación del día a día del Vendedor.
// Si el producto ya tiene movimientos asociados, la base de datos rechaza
// el borrado (por la llave foránea en movimientos.producto_id) — eso es
// intencional: protege el historial en vez de dejarlo huérfano.
app.delete('/api/productos/:id', verifyToken, requireRole('Administrador'), async (req, res) => {
    try {
        const result = await db.query('DELETE FROM productos WHERE id = $1 RETURNING id', [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        registrarAuditoria(db, { usuario_id: req.user.id, accion: 'Eliminó', entidad: 'Producto', entidad_id: req.params.id, ip: req.ip });
        res.json({ mensaje: 'Producto eliminado correctamente' });
    } catch (error) {
        if (error.code === '23503') { // violación de llave foránea
            return res.status(409).json({ error: 'No se puede eliminar: este producto tiene movimientos registrados.' });
        }
        console.error('Error al eliminar producto:', error);
        res.status(500).json({ error: 'Error al eliminar el producto' });
    }
});

// Editar los datos de un producto. A propósito NO permite tocar
// stock_actual desde aquí — el stock solo cambia a través de
// POST /api/movimientos, para que el historial de movimientos siempre
// explique cualquier cambio de inventario (si se pudiera editar el stock
// directamente, un ajuste "silencioso" podría desincronizar el historial).
app.put('/api/productos/:id', verifyToken, async (req, res) => {
    const { nombre, categoria_id, proveedor_id, unidad_medida, precio_venta, ubicacion, stock_minimo } = req.body;

    if (!nombre) {
        return res.status(400).json({ error: 'El nombre es obligatorio' });
    }

    try {
        // Regla de negocio: el precio solo lo cambia quien tenga
        // autorización para parametrizar el sistema (Administrador). Un
        // Vendedor/auxiliar puede editar el resto de los datos del
        // producto, pero el precio se ignora silenciosamente si lo manda
        // alguien sin ese rol — y se conserva el que ya tenía en la BD.
        // Esto se valida aquí, no solo en el frontend: si alguien llamara
        // a la API directamente (sin pasar por la interfaz), igual no
        // podría colarse un cambio de precio sin el rol correcto.
        let precioFinal;
        if (req.user.rol === 'Administrador') {
            if (!precio_venta || Number(precio_venta) <= 0) {
                return res.status(400).json({ error: 'El precio debe ser mayor a 0' });
            }
            precioFinal = precio_venta;
        } else {
            const actual = await db.query('SELECT precio_venta FROM productos WHERE id = $1', [req.params.id]);
            if (actual.rows.length === 0) {
                return res.status(404).json({ error: 'Producto no encontrado' });
            }
            precioFinal = actual.rows[0].precio_venta;
        }

        const result = await db.query(`
            UPDATE productos
            SET nombre = $1, categoria_id = $2, proveedor_id = $3, unidad_medida = $4,
                precio_venta = $5, ubicacion = $6, stock_minimo = $7,
                estado = CASE
                    WHEN stock_actual <= 0 THEN 'Agotado'
                    WHEN stock_actual <= $7 THEN 'Stock Bajo'
                    ELSE 'Óptimo'
                END
            WHERE id = $8
            RETURNING *
        `, [nombre, categoria_id || null, proveedor_id || null, unidad_medida, precioFinal, ubicacion, stock_minimo || 5, req.params.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        registrarAuditoria(db, { usuario_id: req.user.id, accion: 'Editó', entidad: 'Producto', entidad_id: req.params.id, detalle: nombre, ip: req.ip });
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error al editar producto:', error);
        res.status(500).json({ error: 'Error al editar el producto' });
    }
});

// ==============================================================================
// RUTAS - MOVIMIENTOS (Entradas / Salidas)
// Usa una transacción: si algo falla, el stock nunca queda descuadrado.
// ==============================================================================
app.post('/api/movimientos', verifyToken, async (req, res) => {
    const { producto_id, tipo_movimiento, cantidad, motivo } = req.body;
    const usuario_id = req.user.id; // viene del token verificado, no del body

    if (!producto_id || !tipo_movimiento || !cantidad) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }
    if (cantidad <= 0) {
        return res.status(400).json({ error: 'La cantidad debe ser mayor a cero' });
    }

    const client = await db.connect();
    try {
        await client.query('BEGIN');

        // Verificar stock disponible antes de una Salida
        if (tipo_movimiento === 'Salida') {
            const productoActual = await client.query('SELECT stock_actual FROM productos WHERE id = $1', [producto_id]);
            if (productoActual.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'Producto no encontrado' });
            }
            if (productoActual.rows[0].stock_actual < cantidad) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    error: `Stock insuficiente. Solo hay ${productoActual.rows[0].stock_actual} unidades disponibles`
                });
            }
        }

        await client.query(`
            INSERT INTO movimientos (producto_id, usuario_id, tipo_movimiento, cantidad, motivo)
            VALUES ($1, $2, $3, $4, $5)
        `, [producto_id, usuario_id, tipo_movimiento, cantidad, motivo]);

        const operador = tipo_movimiento === 'Entrada' ? '+' : '-';
        await client.query(`
            UPDATE productos
            SET stock_actual = stock_actual ${operador} $1,
                estado = CASE
                    WHEN (stock_actual ${operador} $1) <= 0 THEN 'Agotado'
                    WHEN (stock_actual ${operador} $1) <= stock_minimo THEN 'Stock Bajo'
                    ELSE 'Óptimo'
                END
            WHERE id = $2
        `, [cantidad, producto_id]);

        await client.query('COMMIT');
        registrarAuditoria(db, {
            usuario_id,
            accion: tipo_movimiento === 'Entrada' ? 'Registró entrada' : 'Registró salida',
            entidad: 'Movimiento',
            entidad_id: producto_id,
            detalle: `${cantidad} unidad(es)${motivo ? ' — ' + motivo : ''}`,
            ip: req.ip,
        });
        res.status(201).json({ mensaje: 'Movimiento procesado con éxito' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al procesar movimiento:', error);
        res.status(500).json({ error: 'Error al procesar el movimiento' });
    } finally {
        client.release();
    }
});

app.get('/api/movimientos', verifyToken, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT m.id, m.fecha_movimiento, p.nombre AS producto, m.tipo_movimiento, m.cantidad, u.nombre AS usuario
            FROM movimientos m
            LEFT JOIN productos p ON m.producto_id = p.id
            LEFT JOIN usuarios u ON m.usuario_id = u.id
            ORDER BY m.fecha_movimiento DESC
            LIMIT 100
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener movimientos:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// ==============================================================================
// RUTAS - PROVEEDORES
// ==============================================================================

// Versión liviana (solo id y nombre, sin teléfono/correo/contacto) para que
// CUALQUIER rol pueda llenar el selector de proveedor al crear un producto,
// sin exponerle los datos de contacto completos — esos siguen siendo
// exclusivos de Administrador en la ruta de abajo.
app.get('/api/proveedores/opciones', verifyToken, async (req, res) => {
    try {
        const result = await db.query('SELECT id, nombre FROM proveedores ORDER BY nombre ASC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener opciones de proveedores:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.get('/api/proveedores', verifyToken, requireRole('Administrador'), async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM proveedores ORDER BY nombre ASC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener proveedores:', error);
        res.status(500).json({ error: 'Error al obtener proveedores' });
    }
});

app.post('/api/proveedores', verifyToken, requireRole('Administrador'), async (req, res) => {
    const { nombre, contacto, telefono, email, categoria_suministro } = req.body;

    if (!nombre || !telefono) {
        return res.status(400).json({ error: 'El nombre y el teléfono son obligatorios' });
    }
    if (email && !email.includes('@')) {
        return res.status(400).json({ error: 'El correo no es válido' });
    }

    try {
        const result = await db.query(`
            INSERT INTO proveedores (nombre, contacto, telefono, email, categoria_suministro)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [nombre, contacto, telefono, email, categoria_suministro]);
        registrarAuditoria(db, { usuario_id: req.user.id, accion: 'Creó', entidad: 'Proveedor', entidad_id: String(result.rows[0].id), detalle: nombre, ip: req.ip });
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error al crear proveedor:', error);
        res.status(500).json({ error: 'Error al registrar el proveedor' });
    }
});

// Eliminar un proveedor. Si tiene productos asociados (proveedor_id en
// productos), la base de datos rechaza el borrado por la llave foránea —
// hay que reasignar o eliminar esos productos primero.
app.delete('/api/proveedores/:id', verifyToken, requireRole('Administrador'), async (req, res) => {
    try {
        const result = await db.query('DELETE FROM proveedores WHERE id = $1 RETURNING id', [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Proveedor no encontrado' });
        }
        registrarAuditoria(db, { usuario_id: req.user.id, accion: 'Eliminó', entidad: 'Proveedor', entidad_id: req.params.id, ip: req.ip });
        res.json({ mensaje: 'Proveedor eliminado correctamente' });
    } catch (error) {
        if (error.code === '23503') {
            return res.status(409).json({ error: 'No se puede eliminar: este proveedor tiene productos asociados.' });
        }
        console.error('Error al eliminar proveedor:', error);
        res.status(500).json({ error: 'Error al eliminar el proveedor' });
    }
});

app.put('/api/proveedores/:id', verifyToken, requireRole('Administrador'), async (req, res) => {
    const { nombre, contacto, telefono, email, categoria_suministro } = req.body;

    if (!nombre || !telefono) {
        return res.status(400).json({ error: 'El nombre y el teléfono son obligatorios' });
    }
    if (email && !email.includes('@')) {
        return res.status(400).json({ error: 'El correo no es válido' });
    }

    try {
        const result = await db.query(`
            UPDATE proveedores
            SET nombre = $1, contacto = $2, telefono = $3, email = $4, categoria_suministro = $5
            WHERE id = $6
            RETURNING *
        `, [nombre, contacto, telefono, email, categoria_suministro, req.params.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Proveedor no encontrado' });
        }
        registrarAuditoria(db, { usuario_id: req.user.id, accion: 'Editó', entidad: 'Proveedor', entidad_id: req.params.id, detalle: nombre, ip: req.ip });
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error al editar proveedor:', error);
        res.status(500).json({ error: 'Error al editar el proveedor' });
    }
});

// ==============================================================================
// RUTAS - REPORTES
// ==============================================================================
app.get('/api/reportes/dashboard', verifyToken, requireRole('Administrador'), async (req, res) => {
    try {
        const stats = await db.query(`
            SELECT
                (SELECT COALESCE(SUM(stock_actual * precio_venta), 0) FROM productos) AS valor_inventario,
                (SELECT COUNT(*) FROM productos WHERE stock_actual <= stock_minimo) AS productos_riesgo,
                (SELECT COUNT(*) FROM movimientos WHERE fecha_movimiento > NOW() - INTERVAL '1 day') AS movimientos_hoy
        `);
        res.json(stats.rows[0]);
    } catch (error) {
        console.error('Error en reportes:', error);
        res.status(500).json({ error: 'Error al generar el reporte' });
    }
});

app.get('/api/reportes/top-productos', verifyToken, requireRole('Administrador'), async (req, res) => {
    try {
        const result = await db.query(`
            SELECT p.nombre, p.stock_actual,
                   COALESCE(SUM(CASE WHEN m.tipo_movimiento = 'Salida' THEN m.cantidad ELSE 0 END), 0) AS unidades_vendidas
            FROM productos p
            LEFT JOIN movimientos m ON p.id = m.producto_id
            GROUP BY p.id, p.nombre, p.stock_actual
            ORDER BY unidades_vendidas DESC
            LIMIT 5
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener top de productos:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// ==============================================================================
// RUTAS - USUARIOS
// ==============================================================================
app.get('/api/usuarios', verifyToken, requireRole('Administrador'), async (req, res) => {
    try {
        const result = await db.query('SELECT id, nombre, email, rol, estado FROM usuarios ORDER BY nombre ASC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Crear un usuario nuevo. Exclusivo de Administrador. La contraseña llega
// en texto plano SOLO en este request (por HTTPS en producción) y se
// cifra aquí mismo antes de tocar la base de datos — nunca se guarda ni
// se registra en logs en texto plano.
app.post('/api/usuarios', verifyToken, requireRole('Administrador'), async (req, res) => {
    const { nombre, email, password, rol } = req.body;
    const rolesValidos = ['Administrador', 'Vendedor', 'Bodeguero'];

    if (!nombre || !email || !password) {
        return res.status(400).json({ error: 'Nombre, correo y contraseña son obligatorios.' });
    }
    if (password.length < 8) {
        return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres.' });
    }
    if (rol && !rolesValidos.includes(rol)) {
        return res.status(400).json({ error: `El rol debe ser uno de: ${rolesValidos.join(', ')}.` });
    }

    try {
        const hash = await bcrypt.hash(password, 10);
        const result = await db.query(`
            INSERT INTO usuarios (nombre, email, password_hash, rol)
            VALUES ($1, $2, $3, $4)
            RETURNING id, nombre, email, rol, estado
        `, [nombre, email, hash, rol || 'Bodeguero']);
        registrarAuditoria(db, { usuario_id: req.user.id, accion: 'Creó', entidad: 'Usuario', entidad_id: String(result.rows[0].id), detalle: `${nombre} (${rol || 'Bodeguero'})`, ip: req.ip });
        res.status(201).json(result.rows[0]);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ error: 'Ya existe un usuario con ese correo.' });
        }
        console.error('Error al crear usuario:', error);
        res.status(500).json({ error: 'Error al registrar el usuario' });
    }
});

// ==============================================================================
// RUTAS - AUDITORÍA
// Exclusiva de Administrador: es el historial de "quién hizo qué", no
// tiene sentido que un Vendedor pueda ver las acciones de otros usuarios.
// ==============================================================================
app.get('/api/auditoria', verifyToken, requireRole('Administrador'), async (req, res) => {
    try {
        const result = await db.query(`
            SELECT a.id, a.accion, a.entidad, a.entidad_id, a.detalle, a.ip, a.fecha,
                   u.nombre AS usuario
            FROM auditoria a
            LEFT JOIN usuarios u ON a.usuario_id = u.id
            ORDER BY a.fecha DESC
            LIMIT 200
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener auditoría:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// ==============================================================================
// ENCENDIDO DEL SERVIDOR
// ==============================================================================
// El guard 'require.main === module' evita que el servidor intente escuchar
// en un puerto real cuando este archivo se importa desde las pruebas
// automatizadas (Supertest habla directamente con `app`, sin necesitar un
// puerto abierto). Al correr `node server.js` normalmente, sí arranca.
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 Servidor Backend corriendo en http://localhost:${PORT}`);
        console.log(`💡 Modo de entorno: ${process.env.NODE_ENV || 'desarrollo'}`);
    });
}

module.exports = app;
