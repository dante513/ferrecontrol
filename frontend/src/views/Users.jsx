import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, User, UserPlus, Download, Edit, Trash2 } from 'lucide-react';
import { StatusAlert } from '../components/ui/Alert';
import { UserForm } from '../components/users/UserForm';
import { api } from '../api/client';
import { exportToExcel } from '../utils/exportExcel';

export const Users = ({ isDarkMode, currentUserId }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [alert, setAlert] = useState(null);

  const loadUsers = () => {
    setLoading(true);
    api.getUsuarios()
      .then(setUsers)
      .catch((err) => setAlert({ type: 'error', message: err.message }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadUsers(); }, []);

  const handleSave = async (data) => {
    try {
      await api.postUsuario(data);
      setShowForm(false);
      setAlert({ type: 'success', message: 'Usuario creado correctamente' });
      loadUsers();
    } catch (err) {
      setAlert({ type: 'error', message: err.message });
    }
  };

  const handleUpdate = async (data) => {
    try {
      await api.putUsuario(editingUser.id, data);
      setEditingUser(null);
      setAlert({ type: 'success', message: 'Usuario actualizado correctamente' });
      loadUsers();
    } catch (err) {
      setAlert({ type: 'error', message: err.message });
    }
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`¿Eliminar a "${user.nombre}"? Esta acción no se puede deshacer.`)) return;
    try {
      await api.deleteUsuario(user.id);
      setAlert({ type: 'success', message: 'Usuario eliminado correctamente' });
      loadUsers();
    } catch (err) {
      setAlert({ type: 'error', message: err.message });
    }
  };

  const handleExport = async () => {
    try {
      await exportToExcel('usuarios', 'Usuarios', users.map((u) => ({
        'Nombre': u.nombre,
        'Correo': u.email,
        'Rol': u.rol,
        'Estado': u.estado,
      })));
    } catch (err) {
      setAlert({ type: 'error', message: err.message });
    }
  };

  return (
    <div className="animate-in fade-in duration-500">
      {alert && <StatusAlert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Usuarios y Roles</h1>
          <p className={isDarkMode ? 'text-slate-400' : 'text-gray-500'}>Control de acceso al sistema.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium ${isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
            <Download className="w-4 h-4" aria-hidden="true" /> Exportar
          </button>
          <button
            onClick={() => setShowForm(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isDarkMode ? 'bg-white text-slate-900 hover:bg-gray-200' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
          >
            <UserPlus className="w-4 h-4" aria-hidden="true" /> Agregar Usuario
          </button>
        </div>
      </div>

      {(showForm || editingUser) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <UserForm
            initialData={editingUser}
            onSave={editingUser ? handleUpdate : handleSave}
            onCancel={() => { setShowForm(false); setEditingUser(null); }}
            isDarkMode={isDarkMode}
          />
        </div>
      )}

      <div className={`rounded-2xl border overflow-hidden ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'}`}>
        <table className="w-full text-left">
          <thead>
            <tr className={`text-xs uppercase font-bold ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-gray-50 text-gray-500'}`}>
              <th scope="col" className="px-6 py-4">Usuario</th>
              <th scope="col" className="px-6 py-4">Rol</th>
              <th scope="col" className="px-6 py-4">Estado</th>
              <th scope="col" className="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-slate-800">
            {loading && (
              <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">Cargando usuarios...</td></tr>
            )}
            {!loading && users.map((user) => (
              <tr key={user.id} className={isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-gray-50'}>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-slate-500" aria-hidden="true" />
                    </div>
                    <div>
                      <p className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {user.nombre} {user.id === currentUserId && <span className="text-xs font-normal text-gray-400">(tú)</span>}
                      </p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`flex items-center gap-1 text-xs font-bold ${user.rol === 'Administrador' ? 'text-green-600' : 'text-blue-600'}`}>
                    {user.rol === 'Administrador' ? <ShieldCheck className="w-4 h-4" aria-hidden="true" /> : <ShieldAlert className="w-4 h-4" aria-hidden="true" />}
                    {user.rol}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${user.estado === 'Activo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {user.estado}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setEditingUser(user)} title="Editar" aria-label={`Editar ${user.nombre}`} className="p-1.5 rounded text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30">
                      <Edit className="w-4 h-4" aria-hidden="true" />
                    </button>
                    {/* Nadie puede eliminar su propia cuenta mientras tiene la sesión abierta — el botón ni se muestra en esa fila. */}
                    {user.id !== currentUserId && (
                      <button onClick={() => handleDelete(user)} title="Eliminar" aria-label={`Eliminar ${user.nombre}`} className="p-1.5 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30">
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
