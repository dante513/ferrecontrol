import React, { useState, useEffect } from 'react';
import { History, LogIn, Plus, Pencil, Trash2, ArrowLeftRight, Search } from 'lucide-react';
import { StatusAlert } from '../components/ui/Alert';
import { api } from '../api/client';

const iconByAccion = (accion) => {
  if (accion.includes('Inició sesión')) return LogIn;
  if (accion.includes('Creó')) return Plus;
  if (accion.includes('Editó')) return Pencil;
  if (accion.includes('Eliminó')) return Trash2;
  if (accion.includes('Registró')) return ArrowLeftRight;
  return History;
};

const colorByAccion = (accion, isDarkMode) => {
  if (accion.includes('Eliminó')) return isDarkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-600';
  if (accion.includes('Creó')) return isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-600';
  if (accion.includes('Editó')) return isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600';
  return isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-gray-100 text-gray-600';
};

export const Audit = ({ isDarkMode }) => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    api.getAuditoria()
      .then(setEntries)
      .catch((err) => setAlert({ type: 'error', message: err.message }))
      .finally(() => setLoading(false));
  }, []);

  const filtered = entries.filter((e) => {
    const texto = `${e.usuario || ''} ${e.accion} ${e.entidad} ${e.detalle || ''}`.toLowerCase();
    return texto.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="animate-in fade-in duration-300">
      {alert && <StatusAlert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

      <div className="mb-6">
        <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Auditoría</h1>
        <p className={isDarkMode ? 'text-slate-400' : 'text-gray-500'}>
          Historial de acciones del sistema — quién, qué, cuándo y desde dónde. Últimos 200 registros.
        </p>
      </div>

      <div className={`p-4 rounded-xl border mb-6 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'}`}>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" aria-hidden="true" />
          <label htmlFor="audit-search" className="sr-only">Buscar en el historial</label>
          <input
            id="audit-search"
            type="text"
            placeholder="Buscar por usuario, acción o detalle..."
            className={`w-full pl-10 pr-4 py-2 rounded-lg border focus:ring-2 focus:ring-green-500 outline-none text-sm ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gray-50 border-gray-300'}`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className={`rounded-xl border overflow-hidden ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className={`text-xs uppercase font-semibold ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-gray-50 text-gray-500'}`}>
                <th scope="col" className="px-6 py-4">Fecha</th>
                <th scope="col" className="px-6 py-4">Usuario</th>
                <th scope="col" className="px-6 py-4">Acción</th>
                <th scope="col" className="px-6 py-4">Detalle</th>
                <th scope="col" className="px-6 py-4">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {loading && (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Cargando historial...</td></tr>
              )}
              {!loading && filtered.map((entry) => {
                const Icon = iconByAccion(entry.accion);
                return (
                  <tr key={entry.id} className={isDarkMode ? 'hover:bg-slate-800/50' : 'hover:bg-gray-50'}>
                    <td className={`px-6 py-4 text-sm whitespace-nowrap ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>
                      {new Date(entry.fecha).toLocaleString('es-CO')}
                    </td>
                    <td className={`px-6 py-4 text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {entry.usuario || 'Sistema'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${colorByAccion(entry.accion, isDarkMode)}`}>
                        <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                        {entry.accion} {entry.entidad}
                      </span>
                    </td>
                    <td className={`px-6 py-4 text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{entry.detalle || '—'}</td>
                    <td className={`px-6 py-4 text-xs font-mono ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>{entry.ip || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!loading && filtered.length === 0 && (
            <div className="p-10 text-center text-gray-500">No hay registros que coincidan con tu búsqueda.</div>
          )}
        </div>
      </div>
    </div>
  );
};
