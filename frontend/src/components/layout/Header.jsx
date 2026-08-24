import React, { useState, useEffect } from 'react';
import { Menu, Search, Sun, Moon, Bell, Settings, LogOut, AlertCircle, XCircle } from 'lucide-react';
import { api } from '../../api/client';

export const Header = ({
  user,
  isDarkMode, setIsDarkMode,
  setSidebarOpen,
  setActiveView,
  showNotifications, setShowNotifications,
  showProfileMenu, setShowProfileMenu,
  onLogout
}) => {
  const [alertProducts, setAlertProducts] = useState([]);

  // Notificaciones reales: productos en Stock Bajo o Agotado, calculados a
  // partir de /api/productos (accesible a cualquier rol). Antes esto era un
  // texto quemado ("Stock Crítico: Cemento Gris") que nunca cambiaba.
  useEffect(() => {
    api.getProductos()
      .then((prods) => setAlertProducts(prods.filter((p) => p.estado !== 'Óptimo')))
      .catch(() => {}); // si falla, simplemente no se muestran notificaciones — no bloquea el resto del header
  }, []);

  return (
    <header className={`h-16 border-b flex items-center justify-between px-4 sm:px-6 lg:px-8 z-10 transition-colors duration-300 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'}`}>
      <div className="flex items-center">
        <button
          onClick={() => setSidebarOpen(true)}
          aria-label="Abrir menú de navegación"
          className={`p-2 mr-4 rounded-md lg:hidden focus:outline-none focus:ring-2 focus:ring-green-500 ${isDarkMode ? 'text-slate-400 hover:bg-slate-800' : 'text-gray-500 hover:bg-gray-100'}`}
        >
          <Menu className="w-6 h-6" aria-hidden="true" />
        </button>

        <div className="relative hidden sm:block">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className={`w-5 h-5 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`} aria-hidden="true" />
          </span>
          <label htmlFor="global-search" className="sr-only">Buscar en el sistema</label>
          <input
            id="global-search"
            type="text"
            placeholder="Buscar productos, facturas..."
            className={`pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 w-64 lg:w-96 text-sm transition-colors ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 relative">
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          aria-label={isDarkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          className={`p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 ${isDarkMode ? 'text-yellow-400 hover:bg-slate-800' : 'text-gray-400 hover:bg-gray-100'}`}
        >
          {isDarkMode ? <Sun className="w-6 h-6" aria-hidden="true" /> : <Moon className="w-6 h-6" aria-hidden="true" />}
        </button>

        <div className="relative">
          <button
            onClick={() => { setShowNotifications(!showNotifications); setShowProfileMenu(false); }}
            aria-label={`Ver notificaciones${alertProducts.length > 0 ? ` (${alertProducts.length} pendientes)` : ''}`}
            aria-expanded={showNotifications}
            className={`p-2 rounded-lg transition-colors relative focus:outline-none focus:ring-2 focus:ring-green-500 ${isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
          >
            <Bell className="w-6 h-6" aria-hidden="true" />
            {alertProducts.length > 0 && (
              <span className="absolute top-1 right-1 min-w-[1.1rem] h-[1.1rem] px-1 flex items-center justify-center text-[10px] font-bold bg-red-500 text-white rounded-full border-2 border-white dark:border-slate-900">
                {alertProducts.length > 9 ? '9+' : alertProducts.length}
              </span>
            )}
          </button>

          {showNotifications && (
            <div role="menu" className={`absolute right-0 mt-2 w-80 rounded-xl shadow-lg border overflow-hidden z-50 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
              <div className={`p-4 border-b ${isDarkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-gray-50 border-gray-100'}`}>
                <h3 className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Notificaciones</h3>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {alertProducts.length === 0 && (
                  <p className={`p-4 text-sm ${isDarkMode ? 'text-slate-500' : 'text-gray-500'}`}>Sin alertas de stock por ahora.</p>
                )}
                {alertProducts.map((p) => (
                  <button key={p.id} role="menuitem" onClick={() => { setActiveView('productos'); setShowNotifications(false); }} className={`w-full text-left p-4 border-b transition-colors ${isDarkMode ? 'border-slate-700/50 hover:bg-slate-700' : 'border-gray-50 hover:bg-gray-50'}`}>
                    <div className="flex gap-3 items-start">
                      <div className={`p-2 rounded-full shrink-0 ${p.estado === 'Agotado' ? (isDarkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-600') : (isDarkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-50 text-yellow-600')}`}>
                        {p.estado === 'Agotado' ? <XCircle className="w-4 h-4" aria-hidden="true" /> : <AlertCircle className="w-4 h-4" aria-hidden="true" />}
                      </div>
                      <div>
                        <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{p.estado}: {p.nombre}</p>
                        <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>Quedan {p.stock_actual} unidades ({p.id})</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className={`hidden sm:block h-8 w-px mx-2 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'}`} aria-hidden="true"></div>

        <div className="relative">
          <button
            onClick={() => { setShowProfileMenu(!showProfileMenu); setShowNotifications(false); }}
            aria-label="Abrir menú de usuario"
            aria-haspopup="true"
            aria-expanded={showProfileMenu}
            className={`flex items-center gap-3 pl-2 sm:pl-0 rounded-lg p-1 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-green-500 ${isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-gray-50'}`}
          >
            <div className="w-9 h-9 bg-green-600 text-white rounded-full flex items-center justify-center font-bold shadow-sm" aria-hidden="true">
              {user?.nombre?.charAt(0) || 'U'}
            </div>
            <div className="hidden md:block text-sm mr-2">
              <p className={`font-semibold leading-tight ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{user?.nombre}</p>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{user?.rol}</p>
            </div>
          </button>

          {showProfileMenu && (
            <div role="menu" className={`absolute right-0 mt-2 w-48 rounded-xl shadow-lg border overflow-hidden z-50 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100'}`}>
              <div className="p-2">
                <button
                  role="menuitem"
                  onClick={() => { setActiveView('configuracion'); setShowProfileMenu(false); }}
                  className={`flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 ${isDarkMode ? 'text-slate-300 hover:bg-slate-700 hover:text-green-400' : 'text-gray-700 hover:bg-gray-50 hover:text-green-600'}`}
                >
                  <Settings className="w-4 h-4" aria-hidden="true" /> Mi Cuenta
                </button>
              </div>
              <div className={`p-2 border-t ${isDarkMode ? 'border-slate-700' : 'border-gray-100'}`}>
                <button
                  role="menuitem"
                  onClick={onLogout}
                  className={`flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-red-500 ${isDarkMode ? 'text-red-400 hover:bg-red-900/30' : 'text-red-600 hover:bg-red-50'}`}
                >
                  <LogOut className="w-4 h-4" aria-hidden="true" /> Cerrar Sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
