-- ==============================================================================
-- BASE DE DATOS: FERRÉ CONTROL (REESTRUCTURADA)
-- Proyecto Formativo SENA - ADSO
-- ==============================================================================

-- Necesaria para gen_random_uuid() en versiones de PostgreSQL anteriores a la 16
-- (en la 16+ ya viene incluida en el núcleo, pero declararla no hace daño).
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ------------------------------------------------------------------------------
-- Nota de seguridad: id como UUID en vez de SERIAL
-- Antes estas llaves primarias eran SERIAL (1, 2, 3, ...), es decir,
-- predecibles: alguien podía adivinar que si su usuario es el id 5, el
-- id 6 probablemente también existe. Con UUID (identificadores aleatorios
-- de 128 bits) no hay forma de adivinar un id válido a partir de otro.
-- productos.id NO se cambió porque ya usa un código de negocio (SKU, ej.
-- 'FER-001') que nunca fue secuencial ni adivinable.
-- ------------------------------------------------------------------------------

-- 1. Tabla de Usuarios
CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(50) DEFAULT 'Bodeguero', -- 'Administrador', 'Vendedor', 'Bodeguero'
    estado VARCHAR(20) DEFAULT 'Activo',
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Proveedores
CREATE TABLE proveedores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(150) NOT NULL,
    contacto VARCHAR(100),
    telefono VARCHAR(20),
    email VARCHAR(150),
    categoria_suministro VARCHAR(100), -- Ej: Construcción, Herramientas
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabla de Categorías
CREATE TABLE categorias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) UNIQUE NOT NULL,
    descripcion TEXT
);

-- 4. Tabla de Productos (con precio y proveedor)
CREATE TABLE productos (
    id VARCHAR(50) PRIMARY KEY, -- Ej: 'FER-001' — código de negocio, no secuencial
    nombre VARCHAR(150) NOT NULL,
    categoria_id UUID REFERENCES categorias(id),
    proveedor_id UUID REFERENCES proveedores(id),
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
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    producto_id VARCHAR(50) REFERENCES productos(id),
    usuario_id UUID REFERENCES usuarios(id),
    tipo_movimiento VARCHAR(20) NOT NULL, -- 'Entrada' o 'Salida'
    cantidad INTEGER NOT NULL,
    motivo TEXT,
    fecha_movimiento TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Tabla de Auditoría (quién hizo qué, cuándo y desde dónde)
CREATE TABLE auditoria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES usuarios(id),
    accion VARCHAR(50) NOT NULL,       -- 'Creó', 'Editó', 'Eliminó', 'Inició sesión'
    entidad VARCHAR(50) NOT NULL,      -- 'Producto', 'Proveedor', 'Categoría', 'Usuario', 'Movimiento', 'Sesión'
    entidad_id VARCHAR(50),            -- id del registro afectado (SKU o UUID como texto; puede ser NULL, ej. login)
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
-- SEGURIDAD A NIVEL DE COLUMNA (refuerzo del lado de la base de datos)
-- Complementa la validación que ya existe en el backend: el rol
-- 'ferrecontrol_vendedor' puede editar productos, pero NO puede escribir
-- en la columna precio_venta bajo ninguna circunstancia — la base de datos
-- lo rechaza aunque el código de la aplicación tuviera un error.
--
-- 'GRANT ferrecontrol_vendedor TO CURRENT_USER' le da a quien esté
-- ejecutando este script (normalmente el mismo usuario configurado en
-- DATABASE_URL) permiso para "convertirse" temporalmente en este rol
-- restringido con SET LOCAL ROLE — sin necesidad de una segunda cadena de
-- conexión ni credenciales separadas.
-- ==============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'ferrecontrol_vendedor') THEN
        CREATE ROLE ferrecontrol_vendedor NOLOGIN;
    END IF;
END $$;

GRANT ferrecontrol_vendedor TO CURRENT_USER;

GRANT SELECT ON usuarios, categorias, proveedores, movimientos, auditoria TO ferrecontrol_vendedor;
GRANT SELECT, INSERT ON movimientos TO ferrecontrol_vendedor;
GRANT INSERT ON auditoria TO ferrecontrol_vendedor;

GRANT SELECT, INSERT ON productos TO ferrecontrol_vendedor;
-- Solo estas columnas son editables por este rol — nótese que
-- precio_venta NO está en esta lista a propósito.
GRANT UPDATE (nombre, categoria_id, proveedor_id, unidad_medida, ubicacion, stock_minimo, stock_actual, estado)
    ON productos TO ferrecontrol_vendedor;

-- ==============================================================================
-- DATOS DE PRUEBA
-- Los UUID de las filas semilla se fijan a mano (en vez de dejar que
-- gen_random_uuid() los genere) solo para que las referencias entre tablas
-- de este script sean legibles y reproducibles — en el uso normal de la
-- aplicación, cada fila nueva sí recibe un UUID aleatorio real.
-- ==============================================================================
INSERT INTO categorias (id, nombre) VALUES
    ('a0000000-0000-4000-8000-000000000001', 'Herramientas Eléctricas'),
    ('a0000000-0000-4000-8000-000000000002', 'Construcción'),
    ('a0000000-0000-4000-8000-000000000003', 'Tornillería'),
    ('a0000000-0000-4000-8000-000000000004', 'Pinturas');

INSERT INTO proveedores (id, nombre, contacto, telefono, email, categoria_suministro) VALUES
    ('b0000000-0000-4000-8000-000000000001', 'Argos S.A.', 'Juan Pérez', '310 123 4567', 'ventas@argos.com.co', 'Construcción'),
    ('b0000000-0000-4000-8000-000000000002', 'Dewalt Colombia', 'María López', '300 987 6543', 'contacto@dewalt.com.co', 'Herramientas Eléctricas'),
    ('b0000000-0000-4000-8000-000000000003', 'Pintuco', 'Carlos Ruiz', '320 555 0101', 'ventas@pintuco.com.co', 'Pinturas');

-- IMPORTANTE: 'hash_de_prueba_123' y 'hash_de_prueba_456' NO son hashes reales,
-- son placeholders. Antes de poder iniciar sesión, genera el hash real con:
--     node backend/utils/hashPassword.js "tuContraseña"
-- y reemplaza estos valores por el resultado (empieza con $2a$ o $2b$).
INSERT INTO usuarios (id, nombre, email, password_hash, rol) VALUES
    ('c0000000-0000-4000-8000-000000000001', 'Andrés García', 'admin@ferrecontrol.com', 'hash_de_prueba_123', 'Administrador'),
    ('c0000000-0000-4000-8000-000000000002', 'Beatriz Soler', 'beatriz.ventas@ferrecontrol.com', 'hash_de_prueba_456', 'Vendedor');

INSERT INTO productos (id, nombre, categoria_id, proveedor_id, unidad_medida, precio_venta, ubicacion, stock_actual, stock_minimo, estado) VALUES
    ('FER-001', 'Taladro Percutor Dewalt 800W', 'a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002', 'Unidad', 350000.00, 'Estante A-1', 15, 5, 'Óptimo'),
    ('FER-002', 'Cemento Gris Argos 50kg', 'a0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', 'Bulto', 32000.00, 'Bodega 2', 5, 10, 'Stock Bajo'),
    ('FER-003', 'Caja Tornillos Drywall 2"', 'a0000000-0000-4000-8000-000000000003', NULL, 'Caja', 8500.00, 'Pasillo 4', 120, 20, 'Óptimo'),
    ('FER-004', 'Pintura Vinilo Blanco (Galón)', 'a0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000003', 'Galón', 65000.00, 'Estante P-2', 0, 5, 'Agotado');
