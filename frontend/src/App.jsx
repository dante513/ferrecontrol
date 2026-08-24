import React, { useState, useEffect } from 'react';
import { X, Package } from 'lucide-react';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { Login } from './views/Login';
import { Dashboard } from './views/Dashboard';
import { Inventory } from './views/Inventory';
import { Providers } from './views/Providers';
import { Categories } from './views/Categories';
import { Audit } from './views/Audit';
import { Movements } from './views/Movements';
import { Reports } from './views/Reports';
import { Users } from './views/Users';
import { Settings } from './views/Settings';
import { ProductForm } from './components/inventory/ProductForm';
import { StatusAlert } from './components/ui/Alert';
import { api, getToken, clearToken } from './api/client';

export default function App() {
  const [user, setUser] = useState(null); // { id, nombre, email, rol }
  const [checkingSession, setCheckingSession] = useState(true);
  const [activeView, setActiveView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [globalAlert, setGlobalAlert] = useState(null);

  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('ferre-theme') === 'dark');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Persistencia del modo oscuro
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('ferre-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('ferre-theme', 'light');
    }
  }, [isDarkMode]);

  // Detección de conexión
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Al cargar la app, si ya existe un token guardado, se valida contra el
  // backend en vez de pedir login de nuevo cada vez que se recarga la página.
  useEffect(() => {
    const restoreSession = async () => {
      if (getToken()) {
        try {
          const { usuario } = await api.me();
          setUser(usuario);
        } catch {
          clearToken(); // token vencido o inválido
        }
      }
      setCheckingSession(false);
    };
    restoreSession();
  }, []);

  const handleLogin = (usuario) => {
    setUser(usuario); // { id, nombre, email, rol } — ya viene verificado por el backend
  };

  const handleLogout = () => {
    clearToken();
    setUser(null);
    setActiveView('dashboard');
  };

  if (checkingSession) {
    return null; // evita un parpadeo del login mientras se valida el token guardado
  }

  if (!user) {
    return <Login onLogin={handleLogin} isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} effectivelyOffline={isOffline} />;
  }

  return (
    <div className={`flex h-screen font-sans transition-colors duration-300 ${isDarkMode ? 'dark bg-slate-950' : 'bg-gray-50'}`}>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-64 ml-4 bg-green-600 text-white px-4 py-2 rounded-lg z-[200] font-bold">
        Saltar al contenido principal
      </a>

      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        userRole={user.rol}
        isDarkMode={isDarkMode}
      />

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} aria-hidden="true"></div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden relative">
        {isOffline && (
          <div role="alert" className="w-full bg-red-500 text-white text-xs sm:text-sm font-bold px-4 py-2.5 text-center shrink-0">
            Estás sin conexión a Internet. Los cambios se están guardando localmente.
          </div>
        )}

        <Header
          user={user}
          isDarkMode={isDarkMode}
          setIsDarkMode={setIsDarkMode}
          setSidebarOpen={setSidebarOpen}
          setActiveView={setActiveView}
          showNotifications={showNotifications}
          setShowNotifications={setShowNotifications}
          showProfileMenu={showProfileMenu}
          setShowProfileMenu={setShowProfileMenu}
          onLogout={handleLogout}
        />

        <main id="main-content" className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 outline-none" tabIndex="-1">
          {activeView === 'dashboard' && <Dashboard isDarkMode={isDarkMode} setIsModalOpen={setIsModalOpen} setActiveView={setActiveView} userRole={user.rol} />}
          {activeView === 'productos' && <Inventory isDarkMode={isDarkMode} userRole={user.rol} />}
          {activeView === 'movimientos' && <Movements isDarkMode={isDarkMode} />}
          {activeView === 'configuracion' && <Settings isDarkMode={isDarkMode} user={user} />}

          {/* Vistas exclusivas de Administrador (el Sidebar ya las oculta, esto es la segunda barrera) */}
          {user.rol === 'Administrador' && (
            <>
              {activeView === 'categorias' && <Categories isDarkMode={isDarkMode} />}
              {activeView === 'proveedores' && <Providers isDarkMode={isDarkMode} />}
              {activeView === 'reportes' && <Reports isDarkMode={isDarkMode} />}
              {activeView === 'usuarios' && <Users isDarkMode={isDarkMode} />}
              {activeView === 'auditoria' && <Audit isDarkMode={isDarkMode} />}
            </>
          )}
        </main>
      </div>

      {/* Modal global de "Nuevo Producto" lanzado desde el Dashboard */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="modal-title" className={`rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden ${isDarkMode ? 'bg-slate-900 border border-slate-800' : 'bg-white'}`}>
            <div className={`px-6 py-4 border-b flex justify-between items-center ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'}`}>
                  <Package className="w-5 h-5" aria-hidden="true" />
                </div>
                <h2 id="modal-title" className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Registrar Producto</h2>
              </div>
              <button onClick={() => setIsModalOpen(false)} aria-label="Cerrar" className={isDarkMode ? 'text-slate-400' : 'text-gray-400'}>
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            <div className="p-6">
              <ProductForm
                isDarkMode={isDarkMode}
                onCancel={() => setIsModalOpen(false)}
                onSave={async (data) => {
                  try {
                    await api.postProducto({
                      id: data.id,
                      nombre: data.name,
                      unidad_medida: data.unit || 'Unidad',
                      precio_venta: Number(data.price) || 0,
                      stock_actual: Number(data.stock) || 0,
                      categoria_id: data.categoriaId || null,
                      proveedor_id: data.proveedorId || null,
                    });
                    setIsModalOpen(false);
                    setGlobalAlert({ type: 'success', message: 'Producto guardado exitosamente en el inventario.' });
                  } catch (err) {
                    setGlobalAlert({ type: 'error', message: err.message });
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}

      {globalAlert && <StatusAlert type={globalAlert.type} message={globalAlert.message} onClose={() => setGlobalAlert(null)} />}
    </div>
  );
}
