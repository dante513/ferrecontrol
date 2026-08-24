import React, { useState } from 'react';
import { X, Save } from 'lucide-react';

export const CategoryForm = ({ onSave, onCancel, isDarkMode, initialData }) => {
  const isEditing = Boolean(initialData);
  const [formData, setFormData] = useState(initialData || { nombre: '', descripcion: '' });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!formData.nombre) newErrors.nombre = 'El nombre es obligatorio';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) onSave(formData);
  };

  const inputClass = (field) =>
    `w-full p-2.5 rounded-lg border outline-none text-sm ${
      errors[field] ? 'border-red-500 bg-red-50' : isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-300'
    }`;

  return (
    <div className={`p-6 rounded-2xl border w-full max-w-md ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'}`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{isEditing ? 'Editar Categoría' : 'Nueva Categoría'}</h2>
        <button onClick={onCancel} aria-label="Cerrar" className="text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="category-nombre" className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Nombre</label>
          <input id="category-nombre" type="text" placeholder="Ej. Plomería" className={inputClass('nombre')} value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} />
          {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre}</p>}
        </div>

        <div>
          <label htmlFor="category-descripcion" className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Descripción (opcional)</label>
          <textarea id="category-descripcion" rows="2" className={inputClass('descripcion') + ' resize-none'} value={formData.descripcion} onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })} />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onCancel} className={`px-4 py-2 text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-500'}`}>Cancelar</button>
          <button type="submit" className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors">
            <Save className="w-4 h-4" aria-hidden="true" /> {isEditing ? 'Guardar Cambios' : 'Guardar Categoría'}
          </button>
        </div>
      </form>
    </div>
  );
};
