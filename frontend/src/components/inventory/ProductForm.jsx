import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';

// Si se pasa `initialData`, el formulario entra en modo edición:
// - El código SKU queda de solo lectura (es la llave primaria, no se cambia).
// - No se pide "stock inicial" — el stock actual solo se modifica a través
//   de Movimientos, para no romper la trazabilidad del historial.
export const ProductForm = ({ onSave, onCancel, isDarkMode, initialData, userRole }) => {
  const isEditing = Boolean(initialData);
  // El precio solo lo cambia Administrador. Al crear un producto nuevo no
  // aplica esta restricción (eso lo controla el backend en /api/productos
  // vía POST, que hoy es un tema aparte); esto es específicamente para
  // EDITAR un producto ya existente.
  const precioBloqueado = isEditing && userRole !== 'Administrador';
  const [formData, setFormData] = useState(
    initialData || { id: '', name: '', price: '', stock: '', unit: 'Unidad', categoriaId: '', proveedorId: '' }
  );
  const [errors, setErrors] = useState({});
  const [categorias, setCategorias] = useState([]);
  const [proveedores, setProveedores] = useState([]);

  useEffect(() => {
    // Ambos endpoints son accesibles para cualquier rol autenticado (son
    // solo listas de opciones, sin datos sensibles), así que Administrador
    // y Vendedor pueden clasificar un producto al crearlo o editarlo.
    api.getCategorias().then(setCategorias).catch(() => {});
    api.getProveedoresOpciones().then(setProveedores).catch(() => {});
  }, []);

  const validate = () => {
    const newErrors = {};
    if (!formData.id) newErrors.id = 'El código SKU es obligatorio';
    if (!formData.name) newErrors.name = 'El nombre es obligatorio';
    if (!formData.price || formData.price <= 0) newErrors.price = 'El precio debe ser mayor a 0';
    if (!isEditing && formData.stock < 0) newErrors.stock = 'El stock no puede ser negativo';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) onSave(formData);
  };

  const inputClass = (field) =>
    `w-full p-2.5 rounded-lg border outline-none transition-all text-sm ${
      errors[field]
        ? 'border-red-500 bg-red-50'
        : isDarkMode
        ? 'bg-slate-800 border-slate-700 text-white'
        : 'bg-white border-gray-300'
    }`;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="product-id" className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Código SKU</label>
          <input
            id="product-id"
            type="text"
            placeholder="Ej. FER-005"
            disabled={isEditing}
            className={`${inputClass('id')} ${isEditing ? 'opacity-60 cursor-not-allowed' : ''}`}
            value={formData.id}
            onChange={(e) => setFormData({ ...formData, id: e.target.value })}
          />
          {errors.id && <span className="text-red-500 text-xs mt-1">{errors.id}</span>}
        </div>
        <div>
          <label htmlFor="product-unit" className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Unidad de medida</label>
          <select
            id="product-unit"
            className={inputClass('unit')}
            value={formData.unit}
            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
          >
            <option>Unidad</option>
            <option>Caja</option>
            <option>Bulto</option>
            <option>Galón</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="product-name" className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Nombre del producto</label>
        <input
          id="product-name"
          type="text"
          className={inputClass('name')}
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
        {errors.name && <span className="text-red-500 text-xs mt-1">{errors.name}</span>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="product-category" className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Categoría</label>
          <select
            id="product-category"
            className={inputClass('categoriaId')}
            value={formData.categoriaId}
            onChange={(e) => setFormData({ ...formData, categoriaId: e.target.value })}
          >
            <option value="">Sin categoría</option>
            {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="product-provider" className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Proveedor</label>
          <select
            id="product-provider"
            className={inputClass('proveedorId')}
            value={formData.proveedorId}
            onChange={(e) => setFormData({ ...formData, proveedorId: e.target.value })}
          >
            <option value="">Sin proveedor</option>
            {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="product-price" className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Precio</label>
          <input
            id="product-price"
            type="number"
            disabled={precioBloqueado}
            className={`${inputClass('price')} ${precioBloqueado ? 'opacity-60 cursor-not-allowed' : ''}`}
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
          />
          {precioBloqueado && (
            <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>
              Solo un Administrador puede cambiar el precio.
            </p>
          )}
          {errors.price && <span className="text-red-500 text-xs mt-1">{errors.price}</span>}
        </div>
        {isEditing ? (
          <div>
            <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Stock mínimo (alerta)</label>
            <input
              type="number"
              className={inputClass('stockMinimo')}
              value={formData.stockMinimo ?? ''}
              onChange={(e) => setFormData({ ...formData, stockMinimo: e.target.value })}
            />
          </div>
        ) : (
          <div>
            <label htmlFor="product-stock" className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Stock inicial</label>
            <input
              id="product-stock"
              type="number"
              className={inputClass('stock')}
              value={formData.stock}
              onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
            />
            {errors.stock && <span className="text-red-500 text-xs mt-1">{errors.stock}</span>}
          </div>
        )}
      </div>

      {isEditing && (
        <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>
          El stock actual ({initialData.stock} unidades) no se edita aquí — usa
          "Entradas / Salidas" para registrar cualquier cambio de inventario.
        </p>
      )}

      <div className="flex justify-end gap-3 mt-6">
        <button type="button" onClick={onCancel} className={`px-4 py-2 text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-500'}`}>
          Cancelar
        </button>
        <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors">
          {isEditing ? 'Guardar cambios' : 'Guardar'}
        </button>
      </div>
    </form>
  );
};
