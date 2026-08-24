# FerreControl — Proyecto SENA (ADSO)

Proyecto organizado en tres partes independientes, listas para entregarse por separado:

```
ferrecontrol/
├── docs/       → documentación formal (análisis, diseño, pruebas, despliegue)
├── frontend/   → React (interfaz de usuario)
├── backend/    → Node.js + Express (API REST)
└── database/   → PostgreSQL (schema.sql)
```

## frontend/
Componentizado siguiendo el patrón sugerido (components/ui, components/layout,
components/inventory, components/providers, views, api). `App.jsx` es el orquestador
que maneja autenticación, roles, modo oscuro y las vistas. Inicializado con **Vite**.

Para correrlo:
```bash
cd frontend
cp .env.example .env      # ajusta VITE_API_URL si el backend no corre en localhost:5000
npm install
npm run dev                # http://localhost:3000
```

## backend/
`server.js` expone los endpoints REST. Copia `.env.example` a `.env` y completa
`DATABASE_URL` y `JWT_SECRET` (un secreto propio, largo y aleatorio) antes de correr
`npm install && npm run dev`.

## database/
`schema.sql` crea las tablas (usuarios, proveedores, categorias, productos,
movimientos), los índices recomendados y datos de prueba. Ejecútalo contra una base
PostgreSQL vacía: `psql -U tu_usuario -d ferre_control -f schema.sql`.

## ✅ Autenticación real (bcrypt + JWT) — LISTO

- `POST /api/auth/login` recibe `{ email, password }`, compara contra
  `password_hash` con bcrypt y devuelve `{ token, usuario }`.
- `GET /api/auth/me` valida un token existente (lo usa el frontend al recargar
  la página, para no pedir login de nuevo si la sesión sigue vigente).
- `middleware/auth.js` protege el resto de rutas: `verifyToken` exige un token
  válido, `requireRole('Administrador')` además exige el rol correcto
  (usado en proveedores, reportes y usuarios).
- El frontend (`src/api/client.js`) guarda el token en `localStorage` y lo
  manda automáticamente en cada petición.

### Cómo probarlo paso a paso
1. Corre `database/schema.sql` en tu base PostgreSQL.
2. Genera un hash real de contraseña:
   `node backend/utils/hashPassword.js "tuContraseña"`
3. Reemplaza `'hash_de_prueba_123'` (o `_456`) en la tabla `usuarios` por ese hash,
   con un `UPDATE usuarios SET password_hash = '...' WHERE email = '...';`
4. En `backend/.env`, define `JWT_SECRET` con un valor propio.
5. `cd backend && npm install && npm run dev`
6. En el frontend, define `REACT_APP_API_URL=http://localhost:5000` (o el puerto
   que uses) y corre el login con el correo y la contraseña que hasheaste.

## Pendiente (para seguir con el mes de plazo)

1. ~~Autenticación real~~ ✅ hecho.
2. ~~Conectar el resto del frontend a la API~~ ✅ hecho. Dashboard, Inventario,
   Proveedores, Movimientos, Reportes y Usuarios ya usan `src/api/client.js` en
   vez de datos fijos (la carpeta `data/` se eliminó por quedar sin uso).
   Detalle importante: **no existen endpoints DELETE todavía** — los botones
   "Eliminar" de Inventario y Dashboard son solo visuales por ahora. Si los
   necesitas para la sustentación, dime y agrego `DELETE /api/productos/:id`
   y su conexión en el frontend.
3. ~~`package.json` y configuración de Tailwind del frontend~~ ✅ hecho, con
   **Vite**. Se agregó: `package.json`, `vite.config.js`, `index.html`,
   `src/main.jsx`, `src/index.css`, `tailwind.config.js` (con `darkMode: 'class'`,
   necesario porque `App.jsx` alterna la clase `dark` a mano) y
   `postcss.config.js`. Se probó con `npm install && npm run build` real —
   compila sin errores (214 KB / 60 KB gzip). Nota: `App.js` se renombró a
   `App.jsx`, que es la extensión que espera Vite para archivos con JSX.
4. ~~Limpieza de seguridad antes de sustentar~~ ✅ hecho:
   - Los `defaultValue` con credenciales precargadas ya no existían (se fueron
     al conectar el login real en el punto 1); se revisó todo el frontend con
     `grep` para confirmar que no quedó ningún correo, nombre o contraseña de
     prueba quemado en el código (los usuarios ahora vienen del backend).
   - Se genericizó el placeholder del campo de correo para no insinuar el
     correo real del administrador.
   - Se agregó `express-rate-limit` en `POST /api/auth/login` (máximo 10
     intentos cada 15 minutos por IP) — sin esto, alguien podía intentar
     adivinar contraseñas sin límite.
   - Se agregó `helmet` para las cabeceras HTTP de seguridad básicas
     (`X-Content-Type-Options`, `X-Frame-Options`, etc.).
   - Ambos `.gitignore` (frontend y backend) ya excluyen `.env`, así que el
     `JWT_SECRET` y `DATABASE_URL` reales nunca deberían llegar al repositorio.

## Con los 4 puntos cerrados, lo que queda para un proyecto 100% funcional

- ~~Endpoints DELETE (productos, proveedores)~~ ✅ hecho — `DELETE
  /api/productos/:id` y `DELETE /api/proveedores/:id`, ambos exclusivos de
  Administrador. Si el producto/proveedor tiene registros relacionados
  (movimientos o productos asociados), la base de datos rechaza el borrado
  por la llave foránea — protege el historial en vez de dejarlo huérfano.
  El frontend pide confirmación (`window.confirm`) antes de eliminar.
- ~~Endpoint para agregar usuarios~~ ✅ hecho — `POST /api/usuarios`
  (Administrador), cifra la contraseña con bcrypt antes de guardarla.
  El botón "Agregar Usuario" en la vista Usuarios ya abre un formulario real.
- ~~Categoría/proveedor en el formulario de producto~~ ✅ hecho — se
  agregaron `GET /api/categorias` y `GET /api/proveedores/opciones`
  (ambos accesibles a cualquier rol autenticado, sin exponer datos de
  contacto de los proveedores) para llenar los selects.
- **Pruebas automatizadas** — sigue pendiente. No hay ninguna suite (Jest,
  Supertest) todavía; los casos de `docs/04-pruebas/01-plan-pruebas.md`
  siguen siendo manuales.
- **Edición** (`PUT`) de productos/proveedores/usuarios — todavía no existe;
  solo hay crear, listar y eliminar.

## Seguimiento del análisis de seguridad

De los hallazgos 🔴/🟡 de la revisión de seguridad, se resolvieron:
- **CORS con fallback inseguro** ✅ — antes, si faltaba `FRONTEND_URL`, el
  backend aceptaba cualquier origen (`'*'`) sin avisar. Ahora el fallback es
  `http://localhost:3000`, así que olvidar la variable en producción rompe
  visiblemente el CORS en vez de dejarlo abierto en silencio.
- **Sin límite de tasa fuera del login** ✅ — se agregó un límite general de
  300 peticiones / 15 min por IP a toda `/api/`, además del límite más
  estricto (10/15min) que ya tenía el login.
- **Validación de precio incompleta** ✅ — ahora `precio_venta` es
  obligatorio y siempre se valida `> 0`, sin importar si el campo llega o no
  en el request.
- **Código de producto duplicado sin mensaje claro** ✅ — antes tiraba un
  error genérico 500; ahora responde 409 con un mensaje explícito.

Sigue pendiente (riesgo asumido, documentado):
- **No hay forma de revocar un token JWT antes de que expire** (8h). Es una
  limitación conocida de JWT sin estado; resolverlo requeriría una lista
  negra de tokens o pasar a sesiones con estado — no se justifica para el
  alcance de este proyecto formativo, pero vale mencionarlo si preguntan en
  la sustentación.

## Edición (PUT) — cerrado

`PUT /api/productos/:id`, `PUT /api/proveedores/:id`, `PUT /api/categorias/:id`.
Los formularios (`ProductForm`, `ProviderForm`, `CategoryForm`) ahora sirven
para crear y editar según si reciben `initialData`. El stock de un producto
**no** se edita desde este formulario — solo cambia a través de
Movimientos, para no romper la trazabilidad del historial.

## Pruebas automatizadas — cerrado

`backend/tests/` con Jest + Supertest: 21 pruebas, todas pasando
(`cd backend && npm test`). Como no hay PostgreSQL en el entorno donde se
escribió esto, las pruebas simulan (mock) la capa de base de datos — validan
la lógica real de las rutas (validaciones, mensajes de error, la
transacción de movimientos con su caso de stock insuficiente) sin necesitar
una base de datos real corriendo. Antes de la sustentación, complementa
esto con al menos una corrida manual contra tu base real (los casos de
`docs/04-pruebas/01-plan-pruebas.md` siguen siendo la referencia para eso).

- `tests/middleware.test.js` — verifyToken y requireRole, sin necesidad de mock (son funciones puras).
- `tests/auth.test.js` — login: validación de campos, mensaje genérico ante correo inexistente vs. contraseña incorrecta, usuario inactivo, login exitoso (y que el hash nunca se filtre en la respuesta).
- `tests/productos.test.js` — protección por token, validaciones antes de tocar la BD, código duplicado (409), creación exitosa.
- `tests/movimientos.test.js` — validaciones, y el caso más importante: una Salida mayor al stock disponible hace `ROLLBACK` y nunca llega a insertar el movimiento.

`server.js` se ajustó para exportar `app` sin levantar el servidor cuando
se importa desde las pruebas (`require.main === module`).

## Categorías (inconsistencia cerrada)

Antes, Categorías solo existía como tabla sin interfaz — Proveedores sí
tenía su CRUD completo, Categorías no, lo cual era una asimetría real. Se
agregó: `GET/POST/DELETE /api/categorias`, vista `Categories.jsx` con el
mismo patrón que Proveedores, y entrada en el Sidebar (solo Administrador).

## Exportación a Excel y PDF

- **Excel** (botón "Exportar" en Inventario, Movimientos, Proveedores,
  Usuarios) — genera un `.xlsx` real en el navegador con la librería
  `xlsx` (SheetJS), usando los datos ya cargados en pantalla (respeta los
  filtros activos en Inventario).
- **PDF** (botón "Exportar PDF" en Reportes) — genera un PDF con el resumen
  de indicadores (valor de inventario, movimientos de hoy, productos en
  riesgo) y una tabla de productos en Stock Bajo/Agotado, con `jsPDF` +
  `jspdf-autotable`.
- **Detalle de rendimiento:** estas librerías son pesadas (`xlsx` y
  `jspdf` suman casi 800 KB) y solo se usan al hacer clic en "Exportar", así
  que se cargan con `import()` dinámico en vez de venir incluidas en el
  paquete principal de la app. Sin esto, cualquiera que abriera la app
  tendría que descargar esas librerías aunque nunca exportara nada — con
  el cambio, el paquete principal quedó igual de liviano que antes
  (~243 KB) y Excel/PDF se descargan aparte, solo la primera vez que se
  usan.

## Alcance del proyecto (decisión explícita)

Este sistema es de **control de inventario**, no un punto de venta. Por
decisión del usuario, quedan **fuera de alcance**: código de barras, código
QR, y todo el módulo de Compras/Ventas/Clientes con factura electrónica —
eso implicaría otro sistema completo (facturación electrónica DIAN) que no
es el objetivo de este proyecto formativo.

## Dashboard, filtros/paginación y notificaciones (siguiente entrega)

- **Dashboard** ahora muestra: Total Productos, Valor del Inventario, Stock
  Bajo, Agotados (separados, antes iban juntos), Entradas Hoy, Salidas Hoy
  — más dos widgets nuevos: "Top de ventas recientes" (calculado sobre los
  últimos 100 movimientos que devuelve la API, no es histórico completo —
  se aclara en el título) y "Productos que necesitan atención".
- **Inventario** — se agregaron filtros por **proveedor** y **estado**
  (antes solo había búsqueda por texto y categoría), y **paginación** de 10
  productos por página. Las opciones de proveedor en el filtro salen de los
  productos ya cargados, no de una llamada aparte.
- **Notificaciones del Header** — antes era un texto quemado ("Stock
  Crítico: Cemento Gris") que nunca cambiaba. Ahora se calculan de verdad
  contra `/api/productos`: cuenta real en la campanita, lista de productos
  en Stock Bajo/Agotado, y al hacer clic en una te lleva directo a
  Inventario. También conecté el botón "Mi Cuenta" del menú de perfil, que
  antes no hacía nada — ahora abre Configuración.

**Actualización:** de la lista pendiente que quedaba abajo, ya se cerraron
Reportes PDF/Excel, edición (PUT), pruebas automatizadas y — con esta
sección — Auditoría también. Ver las secciones correspondientes más abajo
en este README para el detalle de cada una.

## Regla de negocio: el precio solo lo cambia Administrador — cerrado

Análisis de seguridad posterior a Auditoría encontró que `PUT
/api/productos/:id` no distinguía roles: un Vendedor podía editar el
precio de un producto igual que un Administrador. Se confirmó con el
usuario que esa NO es la intención de negocio (el precio lo define quien
tenga autorización para parametrizar el sistema — Administrador, contador,
etc. — nunca un auxiliar).

- **Backend:** si quien edita no es Administrador, el precio que venga en
  el body se ignora — se consulta y se conserva el que ya está guardado en
  la base de datos. Esto se valida en el servidor, no solo en el
  frontend: aunque alguien llamara la API directamente (sin pasar por la
  interfaz), no podría colar un cambio de precio sin el rol correcto.
- **Frontend:** el campo de precio aparece deshabilitado (con una nota
  explicando por qué) cuando un Vendedor edita un producto.
- **Nota de alcance:** esta restricción es solo para **editar** un producto
  existente. Crear un producto nuevo (`POST /api/productos`) sigue sin
  restricción de rol — si también quieres bloquear eso, es un cambio
  aparte y pequeño.
- 5 pruebas nuevas verifican esto explícitamente (que el precio que manda
  un Vendedor se ignore de verdad, no solo que la petición no falle) — 30
  pruebas en total, todas pasando.

## Auditoría — cerrado

Tabla `auditoria` en `database/schema.sql` (usuario, acción, entidad,
entidad_id, detalle, IP, fecha). `backend/middleware/audit.js` expone
`registrarAuditoria()`, que se llama de forma "fire and forget" (no bloquea
la respuesta al usuario) después de que la acción principal ya tuvo éxito.

Se instrumentó: login exitoso, crear/editar/eliminar producto,
crear/editar/eliminar proveedor, crear/editar/eliminar categoría, crear
usuario, y registrar movimiento (entrada/salida).

`GET /api/auditoria` (Administrador) devuelve los últimos 200 registros con
el nombre del usuario ya resuelto (JOIN). Vista `Audit.jsx` con buscador
por usuario/acción/detalle, iconos por tipo de acción, y entrada en el
Sidebar. 4 pruebas nuevas en `tests/auditoria.test.js` (protección por rol,
y que un POST exitoso sí dispara el INSERT de auditoría) — 25 pruebas en
total, todas pasando.

**Con esto se cierra toda la lista de mejoras que se planteó para el
proyecto.** Lo único que sigue pendiente de listas anteriores es lo que ya
se había marcado como fuera de alcance (código de barras/QR,
Compras/Ventas/Clientes) o menor (edición de perfil de usuario, backups).
