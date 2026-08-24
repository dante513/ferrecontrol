import React, { useState, useEffect } from 'react';
import { UserPlus, Phone, Mail, Building2, Trash2, Download, Edit } from 'lucide-react';
import { ProviderForm } from '../components/providers/ProviderForm';
import { StatusAlert } from '../components/ui/Alert';
import { api } from '../api/client';
import { exportToExcel } from '../utils/exportExcel';

export const Providers = ({ isDarkMode }) => {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProvider, setEditingProvider] = useState(null);
  const [alert, setAlert] = useState(null);

  const loadProviders = () => {
    setLoading(true);
    api.getProveedores()
      .then(setProviders)
      .catch((err) => setAlert({ type: 'error', message: err.message }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadProviders(); }, []);

  const handleSave = async (data) => {
    try {
      await api.postProveedor({
        nombre: data.name,
        contacto: data.contact,
        telefono: data.phone,
        email: data.email,
      });
      setShowForm(false);
      setAlert({ type: 'success', message: 'Proveedor registrado correctamente' });
      loadProviders();
    } catch (err) {
      setAlert({ type: 'error', message: err.message });
    }
  };

  const handleUpdate = async (data) => {
    try {
      await api.putProveedor(editingProvider.id, {
        nombre: data.name,
        contacto: data.contact,
        telefono: data.phone,
        email: data.email,
      });
      setEditingProvider(null);
      setAlert({ type: 'success', message: 'Proveedor actualizado correctamente' });
      loadProviders();
    } catch (err) {
      setAlert({ type: 'error', message: err.message });
    }
  };

  const openEditForm = (provider) => {
    setEditingProvider({
      id: provider.id,
      name: provider.nombre,
      contact: provider.contacto || '',
      phone: provider.telefono || '',
      email: provider.email || '',
    });
  };

  const handleDelete = async (provider) => {
    if (!window.confirm(`¿Eliminar a "${provider.nombre}" de tus proveedores? Esta acción no se puede deshacer.`)) return;
    try {
      await api.deleteProveedor(provider.id);
      setAlert({ type: 'success', message: 'Proveedor eliminado correctamente' });
      loadProviders();
    } catch (err) {
      setAlert({ type: 'error', message: err.message });
    }
  };

  const handleExport = async () => {
    try {
      await exportToExcel('proveedores', 'Proveedores', providers.map((p) => ({
        'Nombre': p.nombre,
        'Contacto': p.contacto || '—',
        'Teléfono': p.telefono,
        'Correo': p.email || '—',
        'Categoría': p.categoria_suministro || 'General',
      })));
    } catch (err) {
      setAlert({ type: 'error', message: err.message });
    }
  };

  return (
    <div className="animate-in fade-in duration-300">
      {alert && <StatusAlert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Proveedores</h1>
          <p className={isDarkMode ? 'text-slate-400' : 'text-gray-500'}>Empresas aliadas de FerreControl.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium ${isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
            <Download className="w-4 h-4" aria-hidden="true" /> Exportar
          </button>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <UserPlus className="w-4 h-4" aria-hidden="true" /> Nuevo Proveedor
          </button>
        </div>
      </div>

      {(showForm || editingProvider) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg relative">
            <ProviderForm
              initialData={editingProvider}
              onSave={editingProvider ? handleUpdate : handleSave}
              onCancel={() => { setShowForm(false); setEditingProvider(null); }}
              isDarkMode={isDarkMode}
            />
          </div>
        </div>
      )}

      {loading && <p className={isDarkMode ? 'text-slate-400' : 'text-gray-500'}>Cargando proveedores...</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {providers.map((p) => (
          <div key={p.id} className={`p-6 rounded-2xl border shadow-sm hover:shadow-md transition-shadow ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'}`}>
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" aria-hidden="true" />
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-gray-100 text-gray-600'}`}>{p.categoria_suministro || 'General'}</span>
                <button
                  onClick={() => openEditForm(p)}
                  aria-label={`Editar proveedor ${p.nombre}`}
                  title="Editar"
                  className="p-1.5 rounded text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                >
                  <Edit className="w-4 h-4" aria-hidden="true" />
                </button>
                <button
                  onClick={() => handleDelete(p)}
                  aria-label={`Eliminar proveedor ${p.nombre}`}
                  title="Eliminar"
                  className="p-1.5 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30"
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>
            <h3 className={`text-lg font-bold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{p.nombre}</h3>
            <p className={`text-sm mb-4 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{p.contacto}</p>
            <div className="space-y-2 border-t pt-4 dark:border-slate-800">
              <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-slate-400">
                <Phone className="w-4 h-4" aria-hidden="true" /> {p.telefono}
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-slate-400">
                <Mail className="w-4 h-4" aria-hidden="true" /> {p.email}
              </div>
            </div>
          </div>
        ))}
      </div>

      {!loading && providers.length === 0 && (
        <p className={`text-center py-10 ${isDarkMode ? 'text-slate-500' : 'text-gray-500'}`}>Todavía no hay proveedores registrados.</p>
      )}
    </div>
  );
};
