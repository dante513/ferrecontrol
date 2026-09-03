import React, { useState } from 'react';
import { X, Save } from 'lucide-react';

// En modo edición (initialData presente) no se pide ni se toca la
// contraseña — eso sigue siendo exclusivo de "Configuración > Cambiar
// contraseña" de cada usuario. Aquí solo se editan nombre, correo, rol y
// estado (Activo/Inactivo).
export const UserForm = ({ onSave, onCancel, isDarkMode, initialData }) => {
  const isEditing = Boolean(initialData);
  const [formData, setFormData] = useState(
    initialData || { nombre: '', email: '', password: '', rol: 'Vendedor', estado: 'Activo' }
  );
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!formData.nombre) newErrors.nombre = 'El nombre es obligatorio';
    if (!formData.email.includes('@')) newErrors.email = 'El correo no es válido';
    if (!isEditing && formData.password.length < 8) newErrors.password = 'La contraseña debe tener al menos 8 caracteres';
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
        <h2 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{isEditing ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
        <button onClick={onCancel} aria-label="Cerrar" className="text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="user-nombre" className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Nombre completo</label>
          <input id="user-nombre" type="text" className={inputClass('nombre')} value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} />
          {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre}</p>}
        </div>

        <div>
          <label htmlFor="user-email" className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Correo</label>
          <input id="user-email" type="email" className={inputClass('email')} value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
        </div>

        {!isEditing && (
          <div>
            <label htmlFor="user-password" className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Contraseña temporal</label>
            <input id="user-password" type="password" className={inputClass('password')} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="user-rol" className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Rol</label>
            <select id="user-rol" className={inputClass('rol')} value={formData.rol} onChange={(e) => setFormData({ ...formData, rol: e.target.value })}>
              <option value="Administrador">Administrador</option>
              <option value="Vendedor">Vendedor</option>
              <option value="Bodeguero">Bodeguero</option>
            </select>
          </div>
          {isEditing && (
            <div>
              <label htmlFor="user-estado" className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Estado</label>
              <select id="user-estado" className={inputClass('estado')} value={formData.estado} onChange={(e) => setFormData({ ...formData, estado: e.target.value })}>
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div>
          )}
        </div>

        {!isEditing && (
          <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>
            Comunícale esta contraseña temporal por un canal seguro — desde
            "Configuración" el usuario puede cambiarla por una propia en
            cualquier momento.
          </p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onCancel} className={`px-4 py-2 text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-500'}`}>Cancelar</button>
          <button type="submit" className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors">
            <Save className="w-4 h-4" aria-hidden="true" /> {isEditing ? 'Guardar Cambios' : 'Crear Usuario'}
          </button>
        </div>
      </form>
    </div>
  );
};
