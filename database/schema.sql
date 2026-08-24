-- ==============================================================================
-- BASE DE DATOS: FERRÉ CONTROL (REESTRUCTURADA)
-- Proyecto Formativo SENA - ADSO
-- ==============================================================================

-- 1. Tabla de Usuarios
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(50) DEFAULT 'Bodeguero', -- 'Administrador', 'Vendedor', 'Bodeguero'
    estado VARCHAR(20) DEFAULT 'Activo',
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Proveedores
CREATE TABLE proveedores (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    contacto VARCHAR(100),
    telefono VARCHAR(20),
    email VARCHAR(150),
    categoria_suministro VARCHAR(100), -- Ej: Construcción, Herramientas
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabla de Categorías
CREATE TABLE categorias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) UNIQUE NOT NULL,
    descripcion TEXT
);

-- 4. Tabla de Productos (con precio y proveedor)
CREATE TABLE productos (
    id VARCHAR(50) PRIMARY KEY, -- Ej: 'FER-001'
    nombre VARCHAR(150) NOT NULL,
    categoria_id INTEGER REFERENCES categorias(id),
    proveedor_id INTEGER REFERENCES proveedores(id),
    unidad_medida VARCHAR(20) NOT NULL, -- Unidad, Bulto, Galón, Caja
    precio_venta DECIMAL(12, 2) DEFAULT 0.00,
    ubicacion VARCHAR(100),
    stock_actual INTEGER DEFAULT 0,
    stock_minimo INTEGER DEFAULT 5,
    estado VARCHAR(20) DEFAULT 'Óptimo', -- Óptimo, Stock Bajo, Agotado
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabla de Movimientos (historial de entradas/salidas)
CREATE TABLE movimientos (
    id SERIAL PRIMARY KEY,
    producto_id VARCHAR(50) REFERENCES productos(id),
    usuario_id INTEGER REFERENCES usuarios(id),
    tipo_movimiento VARCHAR(20) NOT NULL, -- 'Entrada' o 'Salida'
    cantidad INTEGER NOT NULL,
    motivo TEXT,
    fecha_movimiento TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Tabla de Auditoría (quién hizo qué, cuándo y desde dónde)
CREATE TABLE auditoria (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id),
    accion VARCHAR(50) NOT NULL,       -- 'Creó', 'Editó', 'Eliminó', 'Inició sesión'
    entidad VARCHAR(50) NOT NULL,      -- 'Producto', 'Proveedor', 'Categoría', 'Usuario', 'Movimiento', 'Sesión'
    entidad_id VARCHAR(50),            -- id del registro afectado (puede ser NULL, ej. login)
    detalle TEXT,                      -- descripción legible, ej. 'Martillo Stanley'
    ip VARCHAR(45),                    -- IPv4 o IPv6
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- ÍNDICES RECOMENDADOS (mejoran las consultas más frecuentes del sistema)
-- ==============================================================================
CREATE INDEX idx_productos_categoria ON productos(categoria_id);
CREATE INDEX idx_productos_proveedor ON productos(proveedor_id);
CREATE INDEX idx_movimientos_producto ON movimientos(producto_id);
CREATE INDEX idx_movimientos_fecha ON movimientos(fecha_movimiento);

-- ==============================================================================
-- DATOS DE PRUEBA
-- ==============================================================================
INSERT INTO categorias (nombre) VALUES
    ('Herramientas Eléctricas'),
    ('Construcción'),
    ('Tornillería'),
    ('Pinturas');

INSERT INTO proveedores (nombre, contacto, telefono, email, categoria_suministro) VALUES
    ('Argos S.A.', 'Juan Pérez', '310 123 4567', 'ventas@argos.com.co', 'Construcción'),
    ('Dewalt Colombia', 'María López', '300 987 6543', 'contacto@dewalt.com.co', 'Herramientas Eléctricas'),
    ('Pintuco', 'Carlos Ruiz', '320 555 0101', 'ventas@pintuco.com.co', 'Pinturas');

-- IMPORTANTE: 'hash_de_prueba_123' y 'hash_de_prueba_456' NO son hashes reales,
-- son placeholders. Antes de poder iniciar sesión, genera el hash real con:
--     node backend/utils/hashPassword.js "tuContraseña"
-- y reemplaza estos valores por el resultado (empieza con $2a$ o $2b$).
INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES
    ('Andrés García', 'admin@ferrecontrol.com', 'hash_de_prueba_123', 'Administrador'),
    ('Beatriz Soler', 'beatriz.ventas@ferrecontrol.com', 'hash_de_prueba_456', 'Vendedor');

INSERT INTO productos (id, nombre, categoria_id, proveedor_id, unidad_medida, precio_venta, ubicacion, stock_actual, stock_minimo, estado) VALUES
    ('FER-001', 'Taladro Percutor Dewalt 800W', 1, 2, 'Unidad', 350000.00, 'Estante A-1', 15, 5, 'Óptimo'),
    ('FER-002', 'Cemento Gris Argos 50kg', 2, 1, 'Bulto', 32000.00, 'Bodega 2', 5, 10, 'Stock Bajo'),
    ('FER-003', 'Caja Tornillos Drywall 2"', 3, NULL, 'Caja', 8500.00, 'Pasillo 4', 120, 20, 'Óptimo'),
    ('FER-004', 'Pintura Vinilo Blanco (Galón)', 4, 3, 'Galón', 65000.00, 'Estante P-2', 0, 5, 'Agotado');
