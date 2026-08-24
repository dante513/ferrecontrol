# Fase 5 — Despliegue: Manual de Usuario

## Ingreso al sistema

1. Abre FerreControl en el navegador.
2. Escribe tu correo y contraseña institucionales.
3. Si los datos son incorrectos, el sistema te lo indica sin recargar la
   página — puedes corregir e intentar de nuevo (hasta 10 intentos cada 15
   minutos, por seguridad).

## Panel Principal (Dashboard)

Al ingresar verás cuatro indicadores (total de productos, valor del
inventario, productos en stock bajo/agotado, movimientos del día) y una
tabla con los productos más recientes. Desde aquí puedes registrar un
producto nuevo con el botón **Nuevo Producto**.

## Inventario

- Usa el buscador para encontrar un producto por nombre o código.
- Filtra por categoría con el selector.
- **Nuevo Producto** abre un formulario que pide: código SKU, nombre,
  precio y stock inicial. El código SKU no puede repetirse.

> Los botones de editar/eliminar en esta vista todavía son solo visuales —
> no hacen nada al hacer clic (ver la nota en el manual técnico).

## Movimientos de Mercancía

1. Selecciona el producto.
2. Elige si es una **Entrada** (llega mercancía) o **Salida** (sale
   mercancía, por ejemplo una venta).
3. Escribe la cantidad y presiona **Procesar Movimiento**.

Si intentas registrar una salida mayor a la que hay en stock, el sistema te
avisa cuánto hay disponible y no deja continuar — así nunca queda el
inventario en negativo.

## Proveedores *(solo Administrador)*

Muestra las empresas registradas como tarjetas, con su contacto, teléfono y
correo. **Nuevo Proveedor** abre un formulario que valida que el nombre, el
teléfono y (si lo escribes) el correo tengan un formato válido.

## Reportes *(solo Administrador)*

Muestra el valor total del inventario, cuántos movimientos hubo hoy, cuántos
productos están en riesgo de agotarse, y un ranking de los productos más
vendidos según el historial de movimientos.

## Usuarios y Roles *(solo Administrador)*

Lista quién tiene acceso al sistema, con su rol (Administrador/Vendedor) y
estado (Activo/Inactivo).

> El botón "Agregar Usuario" todavía es solo visual — los usuarios se crean
> directamente en la base de datos por ahora (ver manual técnico).

## Modo oscuro

El ícono de sol/luna en la esquina superior alterna el tema. La preferencia
se recuerda automáticamente la próxima vez que entres, incluso si cierras el
navegador.

## Sin conexión a internet

Si tu conexión se cae mientras usas el sistema, aparece un aviso rojo en la
parte superior. Los formularios pueden seguir abiertos, pero **no se pueden
guardar cambios** hasta que vuelva la conexión, porque el sistema necesita
hablar con el servidor para cada operación.
