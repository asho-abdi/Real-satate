import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

/**
 * Stream an Excel workbook download.
 * @param {import('express').Response} res
 * @param {string} filename
 * @param {{ header: string, key: string, width?: number }[]} columns
 * @param {Record<string, unknown>[]} rows
 */
export async function exportExcel(res, filename, columns, rows) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Report');

  sheet.columns = columns.map((col) => ({
    header: col.header,
    key: col.key,
    width: col.width ?? 18,
  }));

  for (const row of rows) {
    sheet.addRow(row);
  }

  sheet.getRow(1).font = { bold: true };

  const safeName = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
  res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);

  await workbook.xlsx.write(res);
  res.end();
}

/**
 * Stream a simple PDF table download.
 * @param {import('express').Response} res
 * @param {string} filename
 * @param {string} title
 * @param {{ header: string, key: string }[]} columns
 * @param {Record<string, unknown>[]} rows
 */
export function exportPdf(res, filename, title, columns, rows) {
  const safeName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);

  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  doc.pipe(res);

  doc.fontSize(16).text(title, { underline: true });
  doc.moveDown();

  const startX = 40;
  const usableWidth = doc.page.width - 80;
  const colWidth = usableWidth / Math.max(columns.length, 1);
  let y = doc.y;

  doc.fontSize(9).font('Helvetica-Bold');
  columns.forEach((col, i) => {
    doc.text(String(col.header), startX + i * colWidth, y, {
      width: colWidth - 4,
      ellipsis: true,
    });
  });
  y += 18;
  doc.moveTo(startX, y - 4).lineTo(startX + usableWidth, y - 4).stroke();

  doc.font('Helvetica').fontSize(8);
  for (const row of rows) {
    if (y > doc.page.height - 60) {
      doc.addPage();
      y = 40;
    }
    columns.forEach((col, i) => {
      const value = row[col.key];
      doc.text(value == null ? '' : String(value), startX + i * colWidth, y, {
        width: colWidth - 4,
        ellipsis: true,
      });
    });
    y += 16;
  }

  doc.end();
}

export default { exportExcel, exportPdf };
