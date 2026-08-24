import React, { useState } from 'react';
import { X, Save } from 'lucide-react';

export const ProviderForm = ({ onSave, onCancel, isDarkMode, initialData }) => {
  const isEditing = Boolean(initialData);
  const [formData, setFormData] = useState(initialData || { name: '', contact: '', phone: '', email: '' });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!formData.name) newErrors.name = 'El nombre de la empresa es obligatorio';
    if (!formData.phone) newErrors.phone = 'El teléfono es necesario';
    if (formData.email && !formData.email.includes('@')) newErrors.email = 'El correo no es válido';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) onSave(formData);
  };

  const inputClass = (field) =>
    `w-full p-2.5 rounded-lg border outline-none text-sm ${
      errors[field]
        ? 'border-red-500 bg-red-50'
        : isDarkMode
        ? 'bg-slate-800 border-slate-700 text-white'
        : 'bg-white border-gray-300'
    }`;

  return (
    <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'}`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{isEditing ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h2>
        <button onClick={onCancel} aria-label="Cerrar" className="text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="provider-name" className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Nombre de la empresa</label>
          <input id="provider-name" type="text" className={inputClass('name')} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="provider-contact" className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Contacto</label>
            <input id="provider-contact" type="text" className={inputClass('contact')} value={formData.contact} onChange={(e) => setFormData({ ...formData, contact: e.target.value })} />
          </div>
          <div>
            <label htmlFor="provider-phone" className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Teléfono</label>
            <input id="provider-phone" type="text" className={inputClass('phone')} value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
          </div>
        </div>

        <div>
          <label htmlFor="provider-email" className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Correo electrónico</label>
          <input id="provider-email" type="email" className={inputClass('email')} value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onCancel} className={`px-4 py-2 text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-500'}`}>Cancelar</button>
          <button type="submit" className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors">
            <Save className="w-4 h-4" aria-hidden="true" /> {isEditing ? 'Guardar Cambios' : 'Guardar Proveedor'}
          </button>
        </div>
      </form>
    </div>
  );
};
