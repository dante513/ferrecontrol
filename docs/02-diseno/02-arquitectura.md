# Arquitectura del sistema

## Vista general (3 capas)

```mermaid
graph LR
    subgraph Frontend["Frontend — React + Vite"]
        A[Vistas: Login, Dashboard,<br/>Inventario, Movimientos,<br/>Proveedores, Reportes, Usuarios]
        B[api/client.js<br/>fetch + token JWT]
    end

    subgraph Backend["Backend — Node.js + Express"]
        C[server.js<br/>Rutas REST]
        D[middleware/auth.js<br/>verifyToken / requireRole]
    end

    subgraph DB["Base de Datos — PostgreSQL"]
        E[(usuarios, productos,<br/>proveedores, movimientos,<br/>categorias)]
    end

    A --> B
    B -- HTTP + Bearer token --> C
    C --> D
    D --> C
    C -- SQL --> E
```

## Flujo de autenticación

```mermaid
sequenceDiagram
    participant U as Usuario
    participant F as Frontend (Login.jsx)
    participant B as Backend (/api/auth/login)
    participant DB as PostgreSQL

    U->>F: Ingresa correo y contraseña
    F->>B: POST /api/auth/login
    B->>DB: SELECT * FROM usuarios WHERE email = ?
    DB-->>B: Fila del usuario (con password_hash)
    B->>B: bcrypt.compare(password, password_hash)
    alt Credenciales válidas
        B->>B: jwt.sign({id, nombre, email, rol})
        B-->>F: 200 { token, usuario }
        F->>F: Guarda token en localStorage
        F-->>U: Redirige al Dashboard
    else Credenciales inválidas
        B-->>F: 401 { error: "Credenciales incorrectas" }
        F-->>U: Muestra alerta de error
    end
```

## Flujo de un movimiento de inventario (transaccional)

```mermaid
sequenceDiagram
    participant F as Frontend (Movements.jsx)
    participant B as Backend (/api/movimientos)
    participant DB as PostgreSQL

    F->>B: POST /api/movimientos {producto_id, tipo, cantidad}
    B->>DB: BEGIN
    alt tipo_movimiento = Salida
        B->>DB: SELECT stock_actual FROM productos WHERE id = ?
        alt stock insuficiente
            B->>DB: ROLLBACK
            B-->>F: 400 { error: "Stock insuficiente..." }
        end
    end
    B->>DB: INSERT INTO movimientos (...)
    B->>DB: UPDATE productos SET stock_actual = ..., estado = ...
    B->>DB: COMMIT
    B-->>F: 201 { mensaje: "Movimiento procesado con éxito" }
```

## Por qué esta arquitectura

- **Separación en 3 capas** — permite que el frontend, backend y base de
  datos se entreguen y versionen por separado (útil para trabajo en equipo:
  uno puede tocar el frontend sin afectar el backend).
- **Middleware de autenticación centralizado** (`verifyToken`,
  `requireRole`) — evita repetir la validación de token en cada ruta; las
  rutas solo declaran qué rol necesitan.
- **Transacciones SQL en movimientos** — si el servidor falla a mitad de un
  registro de entrada/salida, la base de datos vuelve al estado anterior
  (`ROLLBACK`) en vez de quedar con el stock descuadrado.
