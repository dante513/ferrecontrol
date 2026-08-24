/**
 * Exporta un arreglo de objetos a un archivo .xlsx y dispara la descarga
 * en el navegador. Todo ocurre en el cliente — no hace falta un endpoint
 * en el backend ni guardar el archivo en el servidor.
 *
 * La librería 'xlsx' se carga con import() dinámico, no al inicio del
 * archivo: así el código de exportar (que solo se usa al hacer clic en
 * "Exportar") no infla el paquete principal que se descarga al abrir la
 * aplicación — solo se descarga cuando realmente se necesita.
 *
 * @param {string} filename - nombre del archivo, sin extensión (ej. 'inventario')
 * @param {string} sheetName - nombre de la hoja dentro del Excel
 * @param {Array<Object>} rows - filas a exportar; las llaves del primer
 *   objeto se usan como encabezados de columna
 */
export async function exportToExcel(filename, sheetName, rows) {
  if (!rows || rows.length === 0) {
    throw new Error('No hay datos para exportar.');
  }
  const XLSX = await import('xlsx');
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
}
