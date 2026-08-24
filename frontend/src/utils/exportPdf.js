/**
 * Genera un PDF con un título, un bloque opcional de líneas de resumen
 * (para métricas tipo "Valor del inventario: $X"), y una tabla. Dispara
 * la descarga en el navegador — todo ocurre en el cliente.
 *
 * jsPDF (con jspdf-autotable) se carga con import() dinámico: son
 * librerías pesadas que solo hacen falta al exportar, así que no deben
 * formar parte del paquete que se descarga al abrir la aplicación.
 *
 * @param {Object} opts
 * @param {string} opts.filename - nombre del archivo, sin extensión
 * @param {string} opts.title - título mostrado en la parte superior del PDF
 * @param {string[]} [opts.summaryLines] - líneas de texto antes de la tabla
 * @param {string[]} [opts.columns] - encabezados de la tabla
 * @param {Array<Array<string|number>>} [opts.rows] - filas de la tabla
 */
export async function exportToPdf({ filename, title, summaryLines = [], columns = [], rows = [] }) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text(title, 14, 18);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generado el ${new Date().toLocaleString('es-CO')}`, 14, 24);

  let cursorY = 32;
  if (summaryLines.length > 0) {
    doc.setFontSize(11);
    doc.setTextColor(30);
    summaryLines.forEach((line) => {
      doc.text(line, 14, cursorY);
      cursorY += 6;
    });
    cursorY += 4;
  }

  if (columns.length > 0 && rows.length > 0) {
    autoTable(doc, {
      startY: cursorY,
      head: [columns],
      body: rows,
      headStyles: { fillColor: [22, 163, 74] }, // verde FerreControl
      styles: { fontSize: 9 },
    });
  }

  doc.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);
}
