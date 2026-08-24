import React, { useState, useEffect } from 'react';
import { TrendingUp, Package, AlertTriangle, DollarSign, Download, Calendar } from 'lucide-react';
import { StatusAlert } from '../components/ui/Alert';
import { api } from '../api/client';
import { exportToPdf } from '../utils/exportPdf';

export const Reports = ({ isDarkMode }) => {
  const [stats, setStats] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  const barColors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500', 'bg-pink-500'];

  useEffect(() => {
    setLoading(true);
    Promise.all([api.getReportesDashboard(), api.getTopProductos(), api.getProductos()])
      .then(([dashboardStats, top, prods]) => {
        setStats(dashboardStats);
        setTopProducts(top);
        setProducts(prods);
      })
      .catch((err) => setAlert({ type: 'error', message: err.message }))
      .finally(() => setLoading(false));
  }, []);

  const handleExportPdf = async () => {
    if (!stats) return;
    try {
      const stockBajo = products.filter((p) => p.estado !== 'Óptimo');
      await exportToPdf({
        filename: 'reporte_ferrecontrol',
        title: 'Reporte General — FerreControl',
        summaryLines: [
          `Valor del inventario: $${Number(stats.valor_inventario).toLocaleString('es-CO')}`,
          `Movimientos hoy: ${stats.movimientos_hoy}`,
          `Productos en riesgo (stock bajo o agotado): ${stats.productos_riesgo}`,
        ],
        columns: ['Código', 'Producto', 'Stock', 'Estado'],
        rows: stockBajo.map((p) => [p.id, p.nombre, p.stock_actual, p.estado]),
      });
    } catch (err) {
      setAlert({ type: 'error', message: err.message });
    }
  };

  const maxVendidas = Math.max(1, ...topProducts.map((p) => Number(p.unidades_vendidas)));

  const summaryCards = stats ? [
    { title: 'Valor del Inventario', value: `$${Number(stats.valor_inventario).toLocaleString('es-CO')}`, icon: DollarSign, color: 'text-green-500' },
    { title: 'Movimientos Hoy', value: stats.movimientos_hoy, icon: TrendingUp, color: 'text-blue-500' },
    { title: 'Productos en Riesgo', value: stats.productos_riesgo, icon: AlertTriangle, color: 'text-red-500' },
    { title: 'Referencias Activas', value: topProducts.length, icon: Package, color: 'text-purple-500' },
  ] : [];

  return (
    <div className="animate-in fade-in duration-500">
      {alert && <StatusAlert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Reportes</h1>
          <p className={isDarkMode ? 'text-slate-400' : 'text-gray-500'}>Análisis del rendimiento del negocio.</p>
        </div>
        <div className="flex gap-2">
          <button className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm ${isDarkMode ? 'border-slate-700 text-slate-300' : 'border-gray-300 text-gray-700'}`}>
            <Calendar className="w-4 h-4" aria-hidden="true" /> Últimos 30 días
          </button>
          <button onClick={handleExportPdf} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Download className="w-4 h-4" aria-hidden="true" /> Exportar PDF
          </button>
        </div>
      </div>

      {loading && <p className={isDarkMode ? 'text-slate-400' : 'text-gray-500'}>Cargando reportes...</p>}

      {!loading && stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {summaryCards.map((item, idx) => (
            <div key={idx} className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'}`}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${isDarkMode ? 'bg-slate-800' : 'bg-gray-50'}`}>
                <item.icon className={`w-6 h-6 ${item.color}`} aria-hidden="true" />
              </div>
              <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{item.title}</p>
              <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{item.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'}`}>
          <h2 className={`font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Productos Más Vendidos</h2>
          <div className="space-y-6">
            {topProducts.map((prod, idx) => (
              <div key={idx}>
                <div className="flex justify-between text-sm mb-2">
                  <span className={isDarkMode ? 'text-slate-300' : 'text-gray-700'}>{prod.nombre}</span>
                  <span className="font-bold">{prod.unidades_vendidas} unidades</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-3">
                  <div className={`${barColors[idx % barColors.length]} h-3 rounded-full transition-all duration-500`} style={{ width: `${(Number(prod.unidades_vendidas) / maxVendidas) * 100}%` }}></div>
                </div>
              </div>
            ))}
            {!loading && topProducts.length === 0 && (
              <p className={isDarkMode ? 'text-slate-500' : 'text-gray-500'}>Aún no hay ventas registradas.</p>
            )}
          </div>
        </div>

        <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'}`}>
          <h2 className={`font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Alertas de Reabastecimiento</h2>
          <div className="space-y-4">
            {topProducts.filter((p) => p.stock_actual < 10).map((prod, idx) => (
              <div key={idx} className={`flex items-center gap-4 p-4 rounded-xl border ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
                <AlertTriangle className="text-red-500 w-6 h-6" aria-hidden="true" />
                <div className="flex-1">
                  <p className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{prod.nombre}</p>
                  <p className="text-xs text-red-600">Solo quedan {prod.stock_actual} unidades</p>
                </div>
                <button className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg">Pedir</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
