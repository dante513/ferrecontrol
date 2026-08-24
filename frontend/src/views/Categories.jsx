import React, { useState, useEffect } from 'react';
import { Tag, Plus, Trash2, Edit } from 'lucide-react';
import { CategoryForm } from '../components/categories/CategoryForm';
import { StatusAlert } from '../components/ui/Alert';
import { api } from '../api/client';

export const Categories = ({ isDarkMode }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [alert, setAlert] = useState(null);

  const loadCategories = () => {
    setLoading(true);
    api.getCategorias()
      .then(setCategories)
      .catch((err) => setAlert({ type: 'error', message: err.message }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadCategories(); }, []);

  const handleSave = async (data) => {
    try {
      await api.postCategoria(data);
      setShowForm(false);
      setAlert({ type: 'success', message: 'Categoría registrada correctamente' });
      loadCategories();
    } catch (err) {
      setAlert({ type: 'error', message: err.message });
    }
  };

  const handleUpdate = async (data) => {
    try {
      await api.putCategoria(editingCategory.id, data);
      setEditingCategory(null);
      setAlert({ type: 'success', message: 'Categoría actualizada correctamente' });
      loadCategories();
    } catch (err) {
      setAlert({ type: 'error', message: err.message });
    }
  };

  const handleDelete = async (category) => {
    if (!window.confirm(`¿Eliminar la categoría "${category.nombre}"? Esta acción no se puede deshacer.`)) return;
    try {
      await api.deleteCategoria(category.id);
      setAlert({ type: 'success', message: 'Categoría eliminada correctamente' });
      loadCategories();
    } catch (err) {
      setAlert({ type: 'error', message: err.message });
    }
  };

  return (
    <div className="animate-in fade-in duration-300">
      {alert && <StatusAlert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Categorías</h1>
          <p className={isDarkMode ? 'text-slate-400' : 'text-gray-500'}>Clasificación del catálogo de productos.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" aria-hidden="true" /> Nueva Categoría
        </button>
      </div>

      {(showForm || editingCategory) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <CategoryForm
            initialData={editingCategory}
            onSave={editingCategory ? handleUpdate : handleSave}
            onCancel={() => { setShowForm(false); setEditingCategory(null); }}
            isDarkMode={isDarkMode}
          />
        </div>
      )}

      {loading && <p className={isDarkMode ? 'text-slate-400' : 'text-gray-500'}>Cargando categorías...</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((c) => (
          <div key={c.id} className={`p-5 rounded-xl border flex items-start justify-between gap-3 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'}`}>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Tag className="w-5 h-5 text-green-600 dark:text-green-400" aria-hidden="true" />
              </div>
              <div>
                <p className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{c.nombre}</p>
                {c.descripcion && <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{c.descripcion}</p>}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => setEditingCategory(c)} aria-label={`Editar categoría ${c.nombre}`} title="Editar" className="p-1.5 rounded text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30">
                <Edit className="w-4 h-4" aria-hidden="true" />
              </button>
              <button onClick={() => handleDelete(c)} aria-label={`Eliminar categoría ${c.nombre}`} title="Eliminar" className="p-1.5 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30">
                <Trash2 className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {!loading && categories.length === 0 && (
        <p className={`text-center py-10 ${isDarkMode ? 'text-slate-500' : 'text-gray-500'}`}>Todavía no hay categorías registradas.</p>
      )}
    </div>
  );
};
