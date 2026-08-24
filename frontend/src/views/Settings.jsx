import React, { useState } from 'react';
import { User, Mail, ShieldCheck, KeyRound } from 'lucide-react';
import { StatusAlert } from '../components/ui/Alert';
import { api } from '../api/client';

export const Settings = ({ isDarkMode, user }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  const cardClass = `rounded-2xl border p-6 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'}`;
  const inputClass = (field) =>
    `w-full p-2.5 rounded-lg border outline-none text-sm ${
      errors[field] ? 'border-red-500 bg-red-50' : isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-300'
    }`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAlert(null);

    const newErrors = {};
    if (!currentPassword) newErrors.currentPassword = 'Escribe tu contraseña actual';
    if (!newPassword || newPassword.length < 8) newErrors.newPassword = 'La nueva contraseña debe tener al menos 8 caracteres';
    if (newPassword !== confirmPassword) newErrors.confirmPassword = 'Las contraseñas no coinciden';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setLoading(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      setAlert({ type: 'success', message: 'Tu contraseña se actualizó correctamente.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setAlert({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-300 max-w-2xl">
      {alert && <StatusAlert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

      <div className="mb-8">
        <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Configuración</h1>
        <p className={isDarkMode ? 'text-slate-400' : 'text-gray-500'}>Tu perfil y la seguridad de tu cuenta.</p>
      </div>

      <div className={`${cardClass} mb-6`}>
        <h2 className={`font-bold mb-4 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
          <User className="w-5 h-5 text-green-500" aria-hidden="true" /> Mi perfil
        </h2>
        <dl className="space-y-3 text-sm">
          <div className="flex items-center gap-3">
            <User className="w-4 h-4 text-gray-400" aria-hidden="true" />
            <dt className="sr-only">Nombre</dt>
            <dd className={isDarkMode ? 'text-slate-300' : 'text-gray-700'}>{user?.nombre}</dd>
          </div>
          <div className="flex items-center gap-3">
            <Mail className="w-4 h-4 text-gray-400" aria-hidden="true" />
            <dt className="sr-only">Correo</dt>
            <dd className={isDarkMode ? 'text-slate-300' : 'text-gray-700'}>{user?.email}</dd>
          </div>
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-4 h-4 text-gray-400" aria-hidden="true" />
            <dt className="sr-only">Rol</dt>
            <dd className={isDarkMode ? 'text-slate-300' : 'text-gray-700'}>{user?.rol}</dd>
          </div>
        </dl>
        <p className={`text-xs mt-4 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>
          Para cambiar tu nombre o correo, contacta a un Administrador — todavía no hay edición de perfil desde aquí.
        </p>
      </div>

      <div className={cardClass}>
        <h2 className={`font-bold mb-4 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
          <KeyRound className="w-5 h-5 text-green-500" aria-hidden="true" /> Cambiar contraseña
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="current-password" className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Contraseña actual</label>
            <input
              id="current-password"
              type="password"
              className={inputClass('currentPassword')}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            {errors.currentPassword && <p className="text-red-500 text-xs mt-1">{errors.currentPassword}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="new-password" className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Nueva contraseña</label>
              <input
                id="new-password"
                type="password"
                className={inputClass('newPassword')}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              {errors.newPassword && <p className="text-red-500 text-xs mt-1">{errors.newPassword}</p>}
            </div>
            <div>
              <label htmlFor="confirm-password" className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Confirmar nueva contraseña</label>
              <input
                id="confirm-password"
                type="password"
                className={inputClass('confirmPassword')}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            {loading ? 'Guardando...' : 'Actualizar contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
};
