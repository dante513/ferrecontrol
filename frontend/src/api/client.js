// src/api/client.js
// Cliente centralizado para hablar con el backend de FerreControl.
// Guarda el token JWT en localStorage y lo agrega automáticamente a cada petición.

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export function getToken() {
  return localStorage.getItem('ferre-token');
}

export function setToken(token) {
  localStorage.setItem('ferre-token', token);
}

export function clearToken() {
  localStorage.removeItem('ferre-token');
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'Ocurrió un error al comunicarse con el servidor.');
  }
  return data;
}

export const api = {
  login: (email, password) =>
    request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
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
  getAuditoria: () => request('/api/auditoria'),
};
