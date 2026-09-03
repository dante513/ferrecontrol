import React, { useState } from 'react';
import { Mail, Lock, Sun, Moon, WifiOff } from 'lucide-react';
import { BrandLogo } from '../components/ui/BrandLogo';
import { StatusAlert } from '../components/ui/Alert';
import { api } from '../api/client';

export const Login = ({ onLogin, isDarkMode, setIsDarkMode, effectivelyOffline }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Por favor, completa todos los campos.');
      return;
    }

    setLoading(true);
    try {
      // El backend responde con { usuario } y deja la sesión puesta en
      // cookies (httpOnly para el token, legible para el CSRF) — ya no hay
      // nada que guardar manualmente desde aquí.
      const { usuario } = await api.login(email, password);
      onLogin(usuario);
    } catch (err) {
      setError(err.message || 'Credenciales incorrectas. Verifica tu correo y contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans relative overflow-hidden transition-colors duration-300 ${isDarkMode ? 'bg-slate-950' : 'bg-slate-900'}`}>
      {error && (
        <StatusAlert type="error" message={error} onClose={() => setError(null)} />
      )}

      <a href="#login-form" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-green-600 text-white px-4 py-2 rounded-lg z-[200] font-bold">
        Saltar al formulario de inicio
      </a>

      {effectivelyOffline && (
        <div role="alert" className="absolute top-0 w-full left-0 bg-red-500 text-white text-xs sm:text-sm font-bold px-4 py-2 text-center flex items-center justify-center gap-2 z-[100] shadow-md">
          <WifiOff className="w-5 h-5" aria-hidden="true" />
          Sin conexión a Internet. Iniciando en modo local (Offline).
        </div>
      )}

      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-20 pointer-events-none" aria-hidden="true">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-green-500 blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-blue-500 blur-3xl"></div>
      </div>

      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          aria-label={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          {isDarkMode ? <Sun className="w-6 h-6" aria-hidden="true" /> : <Moon className="w-6 h-6" aria-hidden="true" />}
        </button>
      </div>

      <main id="login-form" className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="flex flex-col items-center justify-center mb-8">
          <BrandLogo isLarge={true} isDarkMode={isDarkMode} />
        </div>

        <div className={`py-8 px-4 shadow-2xl sm:rounded-2xl sm:px-10 border transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'}`}>
          <h1 className={`text-center text-xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Ingreso al Sistema</h1>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="login-email" className={`block text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Usuario / Correo</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none" aria-hidden="true">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`focus:ring-green-500 focus:border-green-500 block w-full pl-10 sm:text-sm rounded-lg py-2.5 border outline-none transition-all ${error && !email ? 'border-red-500 bg-red-50' : isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gray-50 border-gray-300'}`}
                  placeholder="correo@ferrecontrol.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className={`block text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Contraseña</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none" aria-hidden="true">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="login-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`focus:ring-green-500 focus:border-green-500 block w-full pl-10 sm:text-sm rounded-lg py-2.5 border outline-none transition-all ${error && !password ? 'border-red-500 bg-red-50' : isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gray-50 border-gray-300'}`}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-green-600 hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all"
              >
                {loading ? 'Verificando...' : 'Iniciar Sesión'}
              </button>
            </div>
          </form>

          <div className={`mt-6 border-t pt-6 text-center text-xs font-medium ${isDarkMode ? 'border-slate-800 text-slate-500' : 'border-gray-100 text-gray-500'}`}>
            <p>Proyecto Formativo SENA</p>
          </div>
        </div>
      </main>
    </div>
  );
};
