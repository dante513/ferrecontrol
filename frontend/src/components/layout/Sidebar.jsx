import React from 'react';
import { LayoutDashboard, Package, ArrowLeftRight, Users, FileText, Shield, Settings, Tag, History } from 'lucide-react';
import { BrandLogo } from '../ui/BrandLogo';

const menuItems = [
  { id: 'dashboard', label: 'Panel Principal', icon: LayoutDashboard, roles: ['Administrador', 'Vendedor'] },
  { id: 'productos', label: 'Productos', icon: Package, roles: ['Administrador', 'Vendedor'] },
  { id: 'movimientos', label: 'Entradas / Salidas', icon: ArrowLeftRight, roles: ['Administrador', 'Vendedor'] },
  { id: 'categorias', label: 'Categorías', icon: Tag, roles: ['Administrador'] },
  { id: 'proveedores', label: 'Proveedores', icon: Users, roles: ['Administrador'] },
  { id: 'reportes', label: 'Reportes', icon: FileText, roles: ['Administrador'] },
  { id: 'usuarios', label: 'Usuarios y Roles', icon: Shield, roles: ['Administrador'] },
  { id: 'auditoria', label: 'Auditoría', icon: History, roles: ['Administrador'] },
];

export const Sidebar = ({ activeView, setActiveView, sidebarOpen, setSidebarOpen, userRole, isDarkMode }) => {
  const visibleItems = menuItems.filter(item => item.roles.includes(userRole));

  return (
    <aside
      aria-label="Navegación principal"
      className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transition-transform duration-300 ease-in-out border-r border-slate-800 flex flex-col lg:translate-x-0 lg:static lg:inset-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
    >
      <div className="flex flex-col items-center justify-center py-5 border-b border-slate-800 shrink-0" aria-hidden="true">
        <BrandLogo isLarge={false} className="w-10/12" isDarkMode={isDarkMode} />
      </div>

      <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
        {visibleItems.map((item) => (
          <button
            key={item.id}
            onClick={() => { setActiveView(item.id); setSidebarOpen(false); }}
            aria-current={activeView === item.id ? 'page' : undefined}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 ${activeView === item.id ? 'bg-green-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <item.icon className="w-5 h-5" aria-hidden="true" />
            <span className="font-medium">{item.label}</span>
          </button>
        ))}

        <div className="pt-4 mt-4 border-t border-slate-800">
          <button
            onClick={() => { setActiveView('configuracion'); setSidebarOpen(false); }}
            aria-current={activeView === 'configuracion' ? 'page' : undefined}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 ${activeView === 'configuracion' ? 'bg-green-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <Settings className="w-5 h-5" aria-hidden="true" />
            <span className="font-medium">Configuración</span>
          </button>
        </div>
      </nav>
    </aside>
  );
};
