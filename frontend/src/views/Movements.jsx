import React, { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownLeft, History, Download } from 'lucide-react';
import { StatusAlert } from '../components/ui/Alert';
import { api } from '../api/client';
import { exportToExcel } from '../utils/exportExcel';

export const Movements = ({ isDarkMode }) => {
  const [movements, setMovements] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [formData, setFormData] = useState({ productId: '', type: 'Entrada', quantity: '' });

  const loadData = () => {
    setLoading(true);
    Promise.all([api.getMovimientos(), api.getProductos()])
      .then(([movs, prods]) => {
        setMovements(movs);
        setProducts(prods);
      })
      .catch((err) => setAlert({ type: 'error', message: err.message }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    setAlert(null);

    const qty = parseInt(formData.quantity, 10);

    // Validaciones rápidas en el frontend (feedback inmediato);
    // el backend vuelve a validar el stock disponible dentro de la transacción.
    if (!formData.productId || !qty) {
      setAlert({ type: 'error', message: 'Todos los campos son obligatorios.' });
      return;
    }
    if (qty <= 0) {
      setAlert({ type: 'warning', message: 'La cantidad debe ser mayor a cero.' });
      return;
    }

    try {
      await api.postMovimiento({
        producto_id: formData.productId,
        tipo_movimiento: formData.type,
        cantidad: qty,
        motivo: 'Registro manual',
      });
      setAlert({ type: 'success', message: 'Movimiento registrado con éxito.' });
      setFormData({ productId: '', type: 'Entrada', quantity: '' });
      loadData(); // refresca historial y stock actualizado
    } catch (err) {
      // Aquí llegan errores como "Stock insuficiente..." directo del backend
      setAlert({ type: 'error', message: err.message });
    }
  };

  const handleExport = async () => {
    try {
      await exportToExcel('movimientos', 'Movimientos', movements.map((m) => ({
        'Fecha': new Date(m.fecha_movimiento).toLocaleDateString('es-CO'),
        'Producto': m.producto,
        'Tipo': m.tipo_movimiento,
        'Cantidad': m.cantidad,
        'Usuario': m.usuario || '—',
      })));
    } catch (err) {
      setAlert({ type: 'error', message: err.message });
    }
  };

  return (
    <div className="animate-in fade-in duration-500">
      {alert && <StatusAlert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

      <div className="flex justify-between items-center mb-6">
        <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Movimientos de Mercancía</h1>
        <button onClick={handleExport} className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium ${isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
          <Download className="w-4 h-4" aria-hidden="true" /> Exportar
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className={`p-6 rounded-2xl border h-fit ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'}`}>
          <h2 className={`font-bold mb-4 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            <History className="w-5 h-5 text-green-500" aria-hidden="true" /> Nuevo Registro
          </h2>

          <form className="space-y-4" onSubmit={handleRegister}>
            <div>
              <label htmlFor="mov-product" className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Producto</label>
              <select
                id="mov-product"
                className={`w-full p-2.5 rounded-lg border outline-none text-sm ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-300'}`}
                value={formData.productId}
                onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
              >
                <option value="">Seleccione un producto...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre} (Stock: {p.stock_actual})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="mov-type" className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Tipo</label>
                <select
                  id="mov-type"
                  className={`w-full p-2.5 rounded-lg border text-sm ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-300'}`}
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <option value="Entrada">Entrada (+)</option>
                  <option value="Salida">Salida (-)</option>
                </select>
              </div>
              <div>
                <label htmlFor="mov-quantity" className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>Cantidad</label>
                <input
                  id="mov-quantity"
                  type="number"
                  className={`w-full p-2.5 rounded-lg border text-sm ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-gray-300'}`}
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                />
              </div>
            </div>

            <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg text-sm font-medium transition-colors">
              Procesar Movimiento
            </button>
          </form>
        </div>

        <div className={`lg:col-span-2 rounded-2xl border overflow-hidden ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'}`}>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={`text-xs uppercase font-bold ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-gray-50 text-gray-500'}`}>
                <th scope="col" className="px-6 py-4">Fecha</th>
                <th scope="col" className="px-6 py-4">Producto</th>
                <th scope="col" className="px-6 py-4">Tipo</th>
                <th scope="col" className="px-6 py-4">Cant.</th>
                <th scope="col" className="px-6 py-4">Usuario</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-800">
              {loading && (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Cargando movimientos...</td></tr>
              )}
              {!loading && movements.map((m) => (
                <tr key={m.id} className={isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-gray-50'}>
                  <td className={`px-6 py-4 text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{new Date(m.fecha_movimiento).toLocaleDateString('es-CO')}</td>
                  <td className={`px-6 py-4 text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>{m.producto}</td>
                  <td className="px-6 py-4">
                    <span className={`flex items-center gap-1 text-xs font-bold ${m.tipo_movimiento === 'Entrada' ? 'text-green-500' : 'text-red-500'}`}>
                      {m.tipo_movimiento === 'Entrada' ? <ArrowUpRight className="w-3 h-3" aria-hidden="true" /> : <ArrowDownLeft className="w-3 h-3" aria-hidden="true" />}
                      {m.tipo_movimiento}
                    </span>
                  </td>
                  <td className={`px-6 py-4 text-sm font-bold ${m.tipo_movimiento === 'Entrada' ? 'text-green-500' : 'text-red-500'}`}>
                    {m.tipo_movimiento === 'Entrada' ? '+' : '-'}{m.cantidad}
                  </td>
                  <td className={`px-6 py-4 text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>{m.usuario || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
