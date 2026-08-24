import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Box, TrendingUp, AlertCircle, XCircle, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { StatusAlert } from '../components/ui/Alert';
import { api } from '../api/client';

const getStatusColor = (status) => {
  switch (status) {
    case 'Óptimo': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'Stock Bajo': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'Agotado': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  }
};

const barColors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500', 'bg-pink-500'];

// NOTA: el Dashboard es visible para Administrador y Vendedor, así que calcula
// sus estadísticas a partir de /api/productos y /api/movimientos (sin rol
// específico), en vez de /api/reportes/* , que son solo para Administrador.
// El "top de ventas" que arma aquí se calcula sobre los últimos 100
// movimientos que devuelve la API (no es un histórico completo) — se marca
// así en el título del widget para no dar a entender más precisión de la
// que realmente hay.
export const Dashboard = ({ isDarkMode, setIsModalOpen, setActiveView, userRole }) => {
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  function loadDashboard() {
    setLoading(true);
    Promise.all([api.getProductos(), api.getMovimientos()])
      .then(([prods, movs]) => {
        setProducts(prods);
        setMovements(movs);
      })
      .catch((err) => setAlert({ type: 'error', message: err.message }))
      .finally(() => setLoading(false));
  }

  const handleDelete = async (product) => {
    if (!window.confirm(`¿Eliminar "${product.nombre}" (${product.id}) del inventario? Esta acción no se puede deshacer.`)) return;
    try {
      await api.deleteProducto(product.id);
      setAlert({ type: 'success', message: 'Producto eliminado correctamente' });
      loadDashboard();
    } catch (err) {
      setAlert({ type: 'error', message: err.message });
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const movsHoy = movements.filter((m) => m.fecha_movimiento?.startsWith(today));
  const entradasHoy = movsHoy.filter((m) => m.tipo_movimiento === 'Entrada').reduce((sum, m) => sum + Number(m.cantidad), 0);
  const salidasHoy = movsHoy.filter((m) => m.tipo_movimiento === 'Salida').reduce((sum, m) => sum + Number(m.cantidad), 0);

  const valorInventario = products.reduce((sum, p) => sum + Number(p.precio_venta) * p.stock_actual, 0);
  const agotados = products.filter((p) => p.estado === 'Agotado').length;
  const stockBajo = products.filter((p) => p.estado === 'Stock Bajo').length;

  const stats = [
    { title: 'Total Productos', value: products.length, icon: Box, color: 'bg-blue-500' },
    { title: 'Valor del Inventario', value: `$${valorInventario.toLocaleString('es-CO')}`, icon: TrendingUp, color: 'bg-green-500' },
    { title: 'Stock Bajo', value: stockBajo, icon: AlertCircle, color: 'bg-yellow-500' },
    { title: 'Agotados', value: agotados, icon: XCircle, color: 'bg-red-500' },
    { title: 'Entradas Hoy', value: `+${entradasHoy}`, icon: ArrowUpRight, color: 'bg-emerald-500' },
    { title: 'Salidas Hoy', value: `-${salidasHoy}`, icon: ArrowDownLeft, color: 'bg-orange-500' },
  ];

  // Top de productos según unidades de Salida en los movimientos recientes.
  const ventasPorProducto = {};
  movements.filter((m) => m.tipo_movimiento === 'Salida').forEach((m) => {
    ventasPorProducto[m.producto] = (ventasPorProducto[m.producto] || 0) + Number(m.cantidad);
  });
  const topVentas = Object.entries(ventasPorProducto)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const maxVenta = Math.max(1, ...topVentas.map(([, cant]) => cant));

  const recentProducts = products.slice(0, 5);

  return (
    <div className="animate-in fade-in duration-300">
      {alert && <StatusAlert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Panel de Control FERRÉ</h1>
          <p className={`mt-1 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>Gestión integral del inventario ferretero.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          <Plus className="w-4 h-4" aria-hidden="true" /> Nuevo Producto
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div key={index} className={`rounded-xl shadow-sm border p-6 flex items-center gap-4 transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'}`}>
            <div className={`${stat.color} p-3 rounded-lg text-white shadow-sm`} aria-hidden="true">
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{stat.title}</p>
              <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{loading ? '—' : stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className={`rounded-xl shadow-sm border p-6 transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'}`}>
          <h2 className={`font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Top de ventas recientes</h2>
          {topVentas.length === 0 && !loading && (
            <p className={`text-sm ${isDarkMode ? 'text-slate-500' : 'text-gray-500'}`}>Aún no hay salidas registradas.</p>
          )}
          <div className="space-y-4">
            {topVentas.map(([nombre, cantidad], idx) => (
              <div key={nombre}>
                <div className="flex justify-between text-sm mb-1">
                  <span className={isDarkMode ? 'text-slate-300' : 'text-gray-700'}>{nombre}</span>
                  <span className="font-bold">{cantidad} unidades</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-2.5">
                  <div className={`${barColors[idx % barColors.length]} h-2.5 rounded-full`} style={{ width: `${(cantidad / maxVenta) * 100}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`rounded-xl shadow-sm border p-6 transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'}`}>
          <h2 className={`font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Productos que necesitan atención</h2>
          <div className="space-y-3">
            {products.filter((p) => p.estado !== 'Óptimo').slice(0, 5).map((p) => (
              <div key={p.id} className={`flex items-center justify-between p-3 rounded-lg ${isDarkMode ? 'bg-slate-800/50' : 'bg-gray-50'}`}>
                <div>
                  <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{p.nombre}</p>
                  <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-500'}`}>{p.id}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(p.estado)}`}>{p.estado}</span>
              </div>
            ))}
            {!loading && products.filter((p) => p.estado !== 'Óptimo').length === 0 && (
              <p className={`text-sm ${isDarkMode ? 'text-slate-500' : 'text-gray-500'}`}>Todo el inventario está en niveles óptimos.</p>
            )}
          </div>
        </div>
      </div>

      <div className={`rounded-xl shadow-sm border overflow-hidden transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'}`}>
        <div className={`px-6 py-4 border-b flex justify-between items-center ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-gray-50/50 border-gray-100'}`}>
          <h2 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Inventario Reciente</h2>
          <button onClick={() => setActiveView('productos')} className="text-sm text-green-500 font-medium hover:text-green-400 focus:outline-none focus:underline">Ver todo</button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" aria-label="Lista de productos recientes en el inventario">
            <thead>
              <tr className={`text-xs uppercase tracking-wider border-b ${isDarkMode ? 'bg-slate-900 text-slate-400 border-slate-800' : 'bg-white text-gray-500 border-gray-200'}`}>
                <th scope="col" className="px-6 py-4 font-medium">Código</th>
                <th scope="col" className="px-6 py-4 font-medium">Producto</th>
                <th scope="col" className="px-6 py-4 font-medium">Categoría</th>
                <th scope="col" className="px-6 py-4 font-medium">Stock</th>
                <th scope="col" className="px-6 py-4 font-medium">Estado</th>
                <th scope="col" className="px-6 py-4 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-gray-100'}`}>
              {loading && (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">Cargando...</td></tr>
              )}
              {!loading && recentProducts.map((product) => (
                <tr key={product.id} className={`transition-colors ${isDarkMode ? 'hover:bg-slate-800/50' : 'hover:bg-gray-50'}`}>
                  <td className={`px-6 py-4 text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{product.id}</td>
                  <td className={`px-6 py-4 text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>{product.nombre}</td>
                  <td className={`px-6 py-4 text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{product.categoria || 'Sin categoría'}</td>
                  <td className={`px-6 py-4 text-sm font-semibold ${isDarkMode ? 'text-slate-200' : 'text-gray-700'}`}>{product.stock_actual}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(product.estado)}`}>{product.estado}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setActiveView('productos')} title="Editar en Inventario" aria-label={`Editar producto ${product.nombre}`} className={`p-1.5 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'text-slate-400 hover:text-blue-400 hover:bg-blue-900/30' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'}`}>
                        <Edit className="w-4 h-4" aria-hidden="true" />
                      </button>
                      {userRole === 'Administrador' && (
                        <button aria-label={`Eliminar producto ${product.nombre}`} onClick={() => handleDelete(product)} className={`p-1.5 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 ${isDarkMode ? 'text-slate-400 hover:text-red-400 hover:bg-red-900/30' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'}`}>
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
    </div>
  );
};
