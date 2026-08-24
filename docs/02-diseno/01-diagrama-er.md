# Diagrama Entidad-Relación

Refleja exactamente las tablas definidas en `database/schema.sql`.

```mermaid
erDiagram
    USUARIOS ||--o{ MOVIMIENTOS : registra
    PRODUCTOS ||--o{ MOVIMIENTOS : tiene
    CATEGORIAS ||--o{ PRODUCTOS : clasifica
    PROVEEDORES ||--o{ PRODUCTOS : abastece

    USUARIOS {
        serial id PK
        varchar nombre
        varchar email UK
        varchar password_hash
        varchar rol
        varchar estado
        timestamp creado_en
    }

    PROVEEDORES {
        serial id PK
        varchar nombre
        varchar contacto
        varchar telefono
        varchar email
        varchar categoria_suministro
        timestamp creado_en
    }

    CATEGORIAS {
        serial id PK
        varchar nombre UK
        text descripcion
    }

    PRODUCTOS {
        varchar id PK "Ej. FER-001"
        varchar nombre
        integer categoria_id FK
        integer proveedor_id FK
        varchar unidad_medida
        decimal precio_venta
        varchar ubicacion
        integer stock_actual
        integer stock_minimo
        varchar estado
        timestamp creado_en
    }

    MOVIMIENTOS {
        serial id PK
        varchar producto_id FK
        integer usuario_id FK
        varchar tipo_movimiento "Entrada | Salida"
        integer cantidad
        text motivo
        timestamp fecha_movimiento
    }
```

## Notas de diseño

- `productos.id` es un código legible (`FER-001`) en vez de un entero
  autoincremental, porque así lo maneja el negocio (el SKU es el
  identificador natural del producto).
- `productos.estado` se recalcula automáticamente en el backend cada vez que
  cambia el stock (ver `POST /api/movimientos` en el manual técnico), no lo
  edita el usuario directamente.
- `movimientos.usuario_id` se llena con el usuario autenticado (extraído del
  token JWT), nunca con un valor que mande el frontend — así se garantiza
  trazabilidad real de quién hizo cada movimiento.
- Los índices sobre `productos(categoria_id)`, `productos(proveedor_id)`,
  `movimientos(producto_id)` y `movimientos(fecha_movimiento)` existen porque
  son las columnas que más se filtran/ordenan en las consultas del backend.
