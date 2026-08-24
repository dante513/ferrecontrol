# Fase 4 — Pruebas

## Estado real de estas pruebas

**Actualización:** ya existe una suite automatizada real en
`backend/tests/` (Jest + Supertest, 21 pruebas, corren con `npm test` desde
`backend/`). Cubre autenticación, productos y movimientos — incluyendo el
caso más delicado del sistema (una Salida mayor al stock disponible hace
`ROLLBACK` y nunca llega a insertar el movimiento). Como no hay PostgreSQL
en el entorno donde se escribieron, usan una base de datos simulada (mock):
validan la lógica de las rutas, no una base de datos real de punta a punta.

Los casos de esta tabla que **no** están cubiertos todavía por la suite
automatizada (accesibilidad, y algunos casos de Inventario) siguen siendo
manuales — la columna "Cómo verificarlo" sigue aplicando para esos.

## Casos de prueba — Autenticación

| ID | Caso | Resultado esperado | Cómo verificarlo |
|---|---|---|---|
| CP-01 | Login con correo y contraseña correctos | Devuelve token JWT y datos del usuario; redirige al Dashboard | Backend corriendo + usuario con hash real (ver manual técnico) |
| CP-02 | Login con contraseña incorrecta | 401, mensaje genérico "Credenciales incorrectas" (sin decir cuál campo falló) | `server.js`, ruta `/api/auth/login` |
| CP-03 | Login con correo que no existe | 401, mismo mensaje genérico que CP-02 (para no revelar qué correos existen) | Igual que CP-02 |
| CP-04 | Login con campos vacíos | 400 antes de tocar la base de datos | Validación al inicio de la ruta |
| CP-05 | 11 intentos de login en menos de 15 minutos | El intento 11 es bloqueado con 429 | `loginLimiter` en `server.js` |
| CP-06 | Acceder a `/api/productos` sin token | 401 "Token no proporcionado" | Middleware `verifyToken` |
| CP-07 | Acceder a `/api/proveedores` con token de un Vendedor | 403 "No tienes permisos" | Middleware `requireRole('Administrador')` |
| CP-08 | Recargar la página con una sesión activa | No vuelve a pedir login (valida el token contra `/api/auth/me`) | `App.jsx`, `useEffect` de `restoreSession` |

## Casos de prueba — Inventario y Movimientos

| ID | Caso | Resultado esperado | Cómo verificarlo |
|---|---|---|---|
| CP-09 | Registrar producto con código SKU repetido | Error de base de datos (violación de llave primaria) — **el backend no da un mensaje amigable para este caso todavía** | Intentarlo dos veces con el mismo SKU |
| CP-10 | Registrar producto sin nombre | 400 "El código (id) y el nombre son obligatorios" | Ruta `POST /api/productos` |
| CP-11 | Registrar salida mayor al stock disponible | 400 con el stock real disponible en el mensaje; el stock **no** se modifica | Ruta `POST /api/movimientos`, bloque `Salida` |
| CP-12 | Registrar salida igual al stock disponible | Se procesa; el producto queda en stock 0 y `estado = 'Agotado'` | Verificar `productos.estado` tras el movimiento |
| CP-13 | Registrar entrada de cualquier cantidad positiva | Se procesa; suma al stock actual | Ruta `POST /api/movimientos`, bloque `Entrada` |
| CP-14 | Registrar movimiento con cantidad 0 o negativa | 400 antes de llegar a la base de datos | Validación en `Movements.jsx` y en el backend |
| CP-15 | El servidor falla a mitad de un registro de movimiento (simulado apagando la BD) | La tabla `movimientos` y `productos.stock_actual` quedan sin cambios (ROLLBACK) | Requiere prueba manual con la BD apagada a mitad de la transacción |

## Casos de prueba — Accesibilidad (heredados del frontend original)

| ID | Caso | Resultado esperado |
|---|---|---|
| CP-16 | Navegar el formulario de login solo con teclado | Todos los campos y el botón son alcanzables con Tab, en orden lógico |
| CP-17 | Activar un lector de pantalla y cambiar de vista en el Sidebar | Anuncia la vista activa (`aria-current="page"`) |
| CP-18 | Perder la conexión a internet mientras se usa el sistema | Aparece el banner "Sin conexión..." (`aria-live`, sin necesidad de refrescar la página) |

## Cómo ejecutar estas pruebas manualmente (mientras no haya suite automatizada)

1. Levanta backend + base de datos según el manual técnico.
2. Usa una herramienta como Postman, Insomnia o `curl` para los casos de la
   API (CP-01 a CP-15).
3. Usa el navegador con las herramientas de accesibilidad (Lighthouse, o un
   lector de pantalla real) para CP-16 a CP-18.
4. Marca cada caso como Aprobado/Fallido en una copia de esta tabla — esa
   copia con resultados reales es la que deberías anexar como evidencia de
   pruebas en la entrega, no esta plantilla.
