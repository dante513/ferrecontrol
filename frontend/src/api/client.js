// src/api/client.js
// Cliente centralizado para hablar con el backend de FerreControl.
//
// Antes, el token JWT vivía en localStorage y se mandaba a mano en cada
// petición (header Authorization). El problema: localStorage es legible
// por cualquier script que corra en la página — si alguna vez se colara un
// XSS, ese script podría robar el token igual de fácil que nuestro propio
// código. Ahora el token viaja en una cookie httpOnly que el navegador
// maneja solo: JavaScript no puede leerla ni con document.cookie, así que
// ni nuestro código ni un script malicioso pueden acceder a ella
// directamente — el navegador simplemente la reenvía sola en cada
// petición (por eso 'credentials: include' abajo).
//
// Esa protección por sí sola no evita que un sitio externo aproveche esa
// cookie para hacerte mandar una petición sin que te des cuenta (CSRF). Por
// eso el login también entrega una segunda cookie, csrfToken, que SÍ es
// legible — la leemos aquí y la reenviamos en un header en cada petición
// que cambia datos; el backend rechaza la petición si no coincide.

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function getCsrfTokenFromCookie() {
  const match = document.cookie.match(/(?:^|; )csrfToken=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function request(path, options = {}) {
  const csrfToken = getCsrfTokenFromCookie();
  const headers = {
    'Content-Type': 'application/json',
    ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include', // para que el navegador mande/reciba las cookies de sesión
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'Ocurrió un error al comunicarse con el servidor.');
  }
  return data;
}

export const api = {
  login: (email, password) =>
    request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  me: () => request('/api/auth/me'),
  changePassword: (currentPassword, newPassword) =>
    request('/api/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) }),
  getCategorias: () => request('/api/categorias'),
  postCategoria: (data) => request('/api/categorias', { method: 'POST', body: JSON.stringify(data) }),
  putCategoria: (id, data) => request(`/api/categorias/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCategoria: (id) => request(`/api/categorias/${id}`, { method: 'DELETE' }),
  getProductos: () => request('/api/productos'),
  postProducto: (data) => request('/api/productos', { method: 'POST', body: JSON.stringify(data) }),
  putProducto: (id, data) => request(`/api/productos/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProducto: (id) => request(`/api/productos/${id}`, { method: 'DELETE' }),
  getProveedores: () => request('/api/proveedores'),
  getProveedoresOpciones: () => request('/api/proveedores/opciones'),
  postProveedor: (data) => request('/api/proveedores', { method: 'POST', body: JSON.stringify(data) }),
  putProveedor: (id, data) => request(`/api/proveedores/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProveedor: (id) => request(`/api/proveedores/${id}`, { method: 'DELETE' }),
  getMovimientos: () => request('/api/movimientos'),
  postMovimiento: (data) => request('/api/movimientos', { method: 'POST', body: JSON.stringify(data) }),
  getReportesDashboard: () => request('/api/reportes/dashboard'),
  getTopProductos: () => request('/api/reportes/top-productos'),
  getUsuarios: () => request('/api/usuarios'),
  postUsuario: (data) => request('/api/usuarios', { method: 'POST', body: JSON.stringify(data) }),
  putUsuario: (id, data) => request(`/api/usuarios/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUsuario: (id) => request(`/api/usuarios/${id}`, { method: 'DELETE' }),
  getAuditoria: () => request('/api/auditoria'),
};
