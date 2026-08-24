# Fase 3 — Desarrollo: Manual Técnico

## Stack utilizado

| Capa | Tecnología |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, lucide-react |
| Backend | Node.js, Express, JWT (jsonwebtoken), bcryptjs, helmet, express-rate-limit |
| Base de datos | PostgreSQL |

## Estructura del repositorio

```
ferrecontrol/
├── docs/        → esta documentación
├── frontend/    → interfaz de usuario (React + Vite)
├── backend/     → API REST (Node.js + Express)
└── database/    → esquema SQL (PostgreSQL)
```

Detalle de cada parte en su propio README:
- `frontend/` — ver instrucciones de instalación al inicio del README raíz.
- `backend/` — variables de entorno en `.env.example`.
- `database/schema.sql` — script único que crea todas las tablas.

## Cómo levantar el proyecto completo (de cero)

1. **Base de datos**
   ```bash
   psql -U tu_usuario -d ferre_control -f database/schema.sql
   ```
2. **Generar un hash de contraseña real** para poder iniciar sesión (el
   script trae usuarios de ejemplo con hashes falsos, ver
   `04-pruebas/01-plan-pruebas.md` para el motivo):
   ```bash
   node backend/utils/hashPassword.js "tuContraseña"
   ```
   y reemplázalo en la tabla `usuarios` con un `UPDATE`.
3. **Backend**
   ```bash
   cd backend
   cp .env.example .env   # completa DATABASE_URL y JWT_SECRET
   npm install
   npm run dev             # http://localhost:5000
   ```
4. **Frontend**
   ```bash
   cd frontend
   cp .env.example .env   # ajusta VITE_API_URL si el backend no está en localhost:5000
   npm install
   npm run dev             # http://localhost:3000
   ```

## Endpoints de la API (estado real, no planeado)

| Método | Ruta | Protección | Descripción |
|---|---|---|---|
| POST | `/api/auth/login` | Pública (con límite de intentos) | Login, devuelve token JWT |
| GET | `/api/auth/me` | Token | Valida la sesión guardada |
| POST | `/api/auth/change-password` | Token (con límite de intentos) | Cambia la contraseña del usuario autenticado (exige la actual) |
| GET | `/api/categorias` | Token | Lista categorías (para selects) |
| GET | `/api/productos` | Token | Lista productos con categoría y proveedor |
| POST | `/api/productos` | Token | Crea un producto |
| DELETE | `/api/productos/:id` | Token + rol Administrador | Elimina un producto (rechazado si tiene movimientos asociados) |
| GET | `/api/movimientos` | Token | Últimos 100 movimientos |
| POST | `/api/movimientos` | Token | Registra entrada/salida (transaccional) |
| GET | `/api/proveedores/opciones` | Token | Lista liviana (id, nombre) para selects — sin datos de contacto |
| GET | `/api/proveedores` | Token + rol Administrador | Lista proveedores con datos de contacto completos |
| POST | `/api/proveedores` | Token + rol Administrador | Crea un proveedor |
| DELETE | `/api/proveedores/:id` | Token + rol Administrador | Elimina un proveedor (rechazado si tiene productos asociados) |
| GET | `/api/reportes/dashboard` | Token + rol Administrador | Valor de inventario, productos en riesgo, movimientos de hoy |
| GET | `/api/reportes/top-productos` | Token + rol Administrador | Top 5 productos por unidades vendidas |
| GET | `/api/usuarios` | Token + rol Administrador | Lista usuarios |
| POST | `/api/usuarios` | Token + rol Administrador | Crea un usuario (contraseña cifrada con bcrypt) |
| GET | `/api/health` | Pública | Diagnóstico del servidor |

**No implementado todavía**: edición (`PUT`) de productos, proveedores o
usuarios — solo hay crear, listar y (en productos/proveedores) eliminar.

## Convenciones de código usadas

- Componentes de React: funcionales, con Hooks (`useState`, `useEffect`), sin
  clases.
- Nombres de archivo de componentes en PascalCase (`ProductForm.jsx`);
  archivos de datos/utilidades en camelCase (`client.js`).
- El backend valida en dos niveles: el frontend da feedback inmediato (no
  manda cantidades negativas, por ejemplo), y el backend vuelve a validar
  dentro de la transacción — nunca confía solo en la validación del cliente.
