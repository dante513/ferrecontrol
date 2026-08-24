import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Edit, Trash2, Filter, Download, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { ProductForm } from '../components/inventory/ProductForm';
import { StatusAlert } from '../components/ui/Alert';
import { api } from '../api/client';
import { exportToExcel } from '../utils/exportExcel';

const getStatusStyle = (status) => {
  switch (status) {
    case 'Óptimo': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'Stock Bajo': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'Agotado': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const PAGE_SIZE = 10;

export const Inventory = ({ isDarkMode, userRole }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [selectedProvider, setSelectedProvider] = useState('Todos');
  const [selectedStatus, setSelectedStatus] = useState('Todos');
  const [currentPage, setCurrentPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [alert, setAlert] = useState(null);

  const loadProducts = () => {
    setLoading(true);
    api.getProductos()
      .then(setProducts)
      .catch((err) => setAlert({ type: 'error', message: err.message }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadProducts(); }, []);

  const categories = ['Todas', ...new Set(products.map((p) => p.categoria).filter(Boolean))];
  const providers = ['Todos', ...new Set(products.map((p) => p.proveedor).filter(Boolean))];
  const statuses = ['Todos', 'Óptimo', 'Stock Bajo', 'Agotado'];

  const filteredProducts = useMemo(() => products.filter((p) => {
    const matchesSearch = p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || p.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Todas' || p.categoria === selectedCategory;
    const matchesProvider = selectedProvider === 'Todos' || p.proveedor === selectedProvider;
    const matchesStatus = selectedStatus === 'Todos' || p.estado === selectedStatus;
    return matchesSearch && matchesCategory && matchesProvider && matchesStatus;
  }), [products, searchTerm, selectedCategory, selectedProvider, selectedStatus]);

  // Cualquier cambio de filtro/búsqueda vuelve a la página 1, para no
  // quedar "atrapado" en una página vacía si el filtro reduce los resultados.
  useEffect(() => { setCurrentPage(1); }, [searchTerm, selectedCategory, selectedProvider, selectedStatus]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleSaveProduct = async (data) => {
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
      setShowForm(false);
      setAlert({ type: 'success', message: 'Producto guardado correctamente' });
      loadProducts();
    } catch (err) {
      setAlert({ type: 'error', message: err.message });
    }
  };

  const handleUpdateProduct = async (data) => {
    try {
      await api.putProducto(data.id, {
        nombre: data.name,
        unidad_medida: data.unit || 'Unidad',
        precio_venta: Number(data.price) || 0,
        categoria_id: data.categoriaId || null,
        proveedor_id: data.proveedorId || null,
        stock_minimo: Number(data.stockMinimo) || 5,
      });
      setEditingProduct(null);
      setAlert({ type: 'success', message: 'Producto actualizado correctamente' });
      loadProducts();
    } catch (err) {
      setAlert({ type: 'error', message: err.message });
    }
  };

  const openEditForm = (product) => {
    setEditingProduct({
      id: product.id,
      name: product.nombre,
      price: product.precio_venta,
      stock: product.stock_actual,
      stockMinimo: product.stock_minimo,
      unit: product.unidad_medida || 'Unidad',
      categoriaId: product.categoria_id || '',
      proveedorId: product.proveedor_id || '',
    });
  };

  const handleDelete = async (product) => {
    if (!window.confirm(`¿Eliminar "${product.nombre}" (${product.id}) del inventario? Esta acción no se puede deshacer.`)) return;
    try {
      await api.deleteProducto(product.id);
      setAlert({ type: 'success', message: 'Producto eliminado correctamente' });
      loadProducts();
    } catch (err) {
      setAlert({ type: 'error', message: err.message });
    }
  };

  const handleExport = async () => {
    try {
      await exportToExcel('inventario', 'Inventario', filteredProducts.map((p) => ({
        'Código': p.id,
        'Producto': p.nombre,
        'Categoría': p.categoria || 'Sin categoría',
        'Proveedor': p.proveedor || 'Sin proveedor',
        'Stock': p.stock_actual,
        'Precio': Number(p.precio_venta),
        'Estado': p.estado,
      })));
    } catch (err) {
      setAlert({ type: 'error', message: err.message });
    }
  };

  const selectClass = `px-4 py-2 rounded-lg border focus:ring-2 focus:ring-green-500 outline-none text-sm ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gray-50 border-gray-300'}`;

  return (
    <div className="animate-in fade-in duration-300">
      {alert && <StatusAlert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Inventario</h1>
          <p className={isDarkMode ? 'text-slate-400' : 'text-gray-500'}>Control de existencias de la ferretería.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button onClick={handleExport} className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium ${isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
            <Download className="w-4 h-4" aria-hidden="true" /> Exportar
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" aria-hidden="true" /> Nuevo Producto
          </button>
        </div>
      </div>

      {(showForm || editingProduct) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className={`rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden ${isDarkMode ? 'bg-slate-900 border border-slate-800' : 'bg-white'}`}>
            <div className={`px-6 py-4 border-b flex justify-between items-center ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
              <h2 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{editingProduct ? 'Editar Producto' : 'Registrar Producto'}</h2>
              <button onClick={() => { setShowForm(false); setEditingProduct(null); }} aria-label="Cerrar" className={isDarkMode ? 'text-slate-400' : 'text-gray-400'}>
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            <div className="p-6">
              <ProductForm
                initialData={editingProduct}
                onSave={editingProduct ? handleUpdateProduct : handleSaveProduct}
                onCancel={() => { setShowForm(false); setEditingProduct(null); }}
                isDarkMode={isDarkMode}
                userRole={userRole}
              />
            </div>
          </div>
        </div>
      )}

      <div className={`p-4 rounded-xl border mb-6 flex flex-col lg:flex-row gap-4 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'}`}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" aria-hidden="true" />
          <label htmlFor="inventory-search" className="sr-only">Buscar por nombre o código</label>
          <input
            id="inventory-search"
            type="text"
            placeholder="Buscar por nombre o código..."
            className={`w-full pl-10 pr-4 py-2 rounded-lg border focus:ring-2 focus:ring-green-500 outline-none text-sm ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-gray-50 border-gray-300'}`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-5 h-5 text-gray-400 hidden sm:block" aria-hidden="true" />
          <label htmlFor="inventory-category" className="sr-only">Filtrar por categoría</label>
          <select id="inventory-category" className={selectClass} value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
            {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          <label htmlFor="inventory-provider" className="sr-only">Filtrar por proveedor</label>
          <select id="inventory-provider" className={selectClass} value={selectedProvider} onChange={(e) => setSelectedProvider(e.target.value)}>
            {providers.map((prov) => <option key={prov} value={prov}>{prov}</option>)}
          </select>
          <label htmlFor="inventory-status" className="sr-only">Filtrar por estado</label>
          <select id="inventory-status" className={selectClass} value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
            {statuses.map((st) => <option key={st} value={st}>{st}</option>)}
          </select>
        </div>
      </div>

      <div className={`rounded-xl border overflow-hidden ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className={`text-xs uppercase font-semibold ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-gray-50 text-gray-500'}`}>
                <th scope="col" className="px-6 py-4">Código / Producto</th>
                <th scope="col" className="px-6 py-4">Categoría</th>
                <th scope="col" className="px-6 py-4">Proveedor</th>
                <th scope="col" className="px-6 py-4">Stock</th>
                <th scope="col" className="px-6 py-4">Precio (Unit)</th>
                <th scope="col" className="px-6 py-4">Estado</th>
                <th scope="col" className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {loading && (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">Cargando productos...</td></tr>
              )}
              {!loading && paginatedProducts.map((product) => (
                <tr key={product.id} className={isDarkMode ? 'hover:bg-slate-800/50' : 'hover:bg-gray-50'}>
                  <td className="px-6 py-4">
                    <div className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{product.nombre}</div>
                    <div className="text-xs text-gray-500">{product.id}</div>
                  </td>
                  <td className={`px-6 py-4 text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>{product.categoria || 'Sin categoría'}</td>
                  <td className={`px-6 py-4 text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>{product.proveedor || 'Sin proveedor'}</td>
                  <td className={`px-6 py-4 text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>{product.stock_actual}</td>
                  <td className={`px-6 py-4 text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-700'}`}>${Number(product.precio_venta).toLocaleString('es-CO')}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusStyle(product.estado)}`}>{product.estado}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button title="Editar" aria-label={`Editar ${product.nombre}`} onClick={() => openEditForm(product)} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded">
                        <Edit className="w-4 h-4" aria-hidden="true" />
                      </button>
                      {userRole === 'Administrador' && (
                        <button title="Eliminar" aria-label={`Eliminar ${product.nombre}`} onClick={() => handleDelete(product)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded">
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && filteredProducts.length === 0 && (
            <div className="p-10 text-center text-gray-500">No se encontraron productos</div>
          )}
        </div>

        {!loading && filteredProducts.length > 0 && (
          <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
            <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-gray-500'}`}>
              Mostrando {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredProducts.length)} de {filteredProducts.length}
            </p>
            <nav aria-label="Paginación de inventario" className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                aria-label="Página anterior"
                className={`p-1.5 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed ${isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <ChevronLeft className="w-4 h-4" aria-hidden="true" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  aria-current={currentPage === page ? 'page' : undefined}
                  className={`w-8 h-8 text-sm rounded-lg ${currentPage === page ? 'bg-green-600 text-white font-bold' : isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                aria-label="Página siguiente"
                className={`p-1.5 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed ${isDarkMode ? 'text-slate-300 hover:bg-slate-800' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </nav>
          </div>
        )}
      </div>
    </div>
  );
};
