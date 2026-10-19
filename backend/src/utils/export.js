import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

const BRAND = {
  ink: '#0f172a',
  muted: '#64748b',
  border: '#e2e8f0',
  headerBg: '#0f766e',
  headerText: '#ffffff',
  zebra: '#f0fdfa',
  rowLine: '#e2e8f0',
  surface: '#ffffff',
  amount: '#134e4a',
};

const STATUS_COLORS = {
  AVAILABLE: { bg: '#d1fae5', fg: '#065f46' },
  OCCUPIED: { bg: '#cffafe', fg: '#155e75' },
  CHECKED_IN: { bg: '#cffafe', fg: '#155e75' },
  CHECKED_OUT: { bg: '#e2e8f0', fg: '#334155' },
  CANCELLED: { bg: '#fee2e2', fg: '#991b1b' },
  UNPAID: { bg: '#fee2e2', fg: '#991b1b' },
  PARTIAL: { bg: '#ffedd5', fg: '#9a3412' },
  PAID: { bg: '#d1fae5', fg: '#065f46' },
  ACTIVE: { bg: '#d1fae5', fg: '#065f46' },
  OVERDUE: { bg: '#fee2e2', fg: '#991b1b' },
};

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

function cellText(value) {
  if (value == null) return '';
  return String(value);
}

function formatStatusLabel(value) {
  const raw = cellText(value);
  if (!raw) return '';
  return raw
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function normalizeFloor(value) {
  const raw = cellText(value);
  if (!raw || raw === '—') return raw;
  return raw.replace(/^(Floor)(\d+)/i, '$1 $2');
}

function columnWeights(columns) {
  const weights = columns.map((col) => Math.max(col.width ?? 12, 8));
  const total = weights.reduce((sum, w) => sum + w, 0) || 1;
  return weights.map((w) => w / total);
}

function isAmountColumn(col) {
  const key = String(col.key || '').toLowerCase();
  const header = String(col.header || '').toLowerCase();
  return key.includes('amount') || key.includes('balance') || key.includes('rent') || header.includes('amount');
}

function isStatusColumn(col) {
  const key = String(col.key || '').toLowerCase();
  return key === 'status' || key.endsWith('status');
}

/**
 * Stream a designed PDF table download.
 * @param {import('express').Response} res
 * @param {string} filename
 * @param {string} title
 * @param {{ header: string, key: string, width?: number }[]} columns
 * @param {Record<string, unknown>[]} rows
 * @param {{ subtitle?: string }=} options
 */
export function exportPdf(res, filename, title, columns, rows, options = {}) {
  const safeName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);

  const landscape = columns.length > 5;
  const margin = 36;
  const doc = new PDFDocument({
    margin,
    size: 'A4',
    layout: landscape ? 'landscape' : 'portrait',
    bufferPages: true,
  });
  doc.pipe(res);

  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const contentWidth = pageWidth - margin * 2;
  const startX = margin;
  const weights = columnWeights(columns);
  const colWidths = weights.map((w) => w * contentWidth);
  const padX = 6;
  const padY = 5;
  const minRowHeight = 22;
  const fontSize = 8;
  const headerFontSize = 8;
  const tableTopGap = 14;

  const drawPageChrome = () => {
    doc.save();
    doc.rect(0, 0, pageWidth, 56).fill(BRAND.headerBg);
    doc.fillColor(BRAND.headerText).font('Helvetica-Bold').fontSize(14);
    doc.text('RJK REALTY', margin, 16, { width: contentWidth, lineBreak: false });
    doc.font('Helvetica').fontSize(8).fillColor('#ccfbf1');
    doc.text('Operations report', margin, 36, { width: contentWidth, lineBreak: false });
    doc.restore();
  };

  const drawTableHeader = (y) => {
    const headerHeight = 26;
    doc.save();
    doc.roundedRect(startX, y, contentWidth, headerHeight, 4).fill(BRAND.headerBg);
    doc.font('Helvetica-Bold').fontSize(headerFontSize).fillColor(BRAND.headerText);

    let x = startX;
    columns.forEach((col, i) => {
      const width = colWidths[i];
      const align = isAmountColumn(col) ? 'right' : 'left';
      doc.text(String(col.header), x + padX, y + 8, {
        width: width - padX * 2,
        align,
        lineBreak: false,
        ellipsis: true,
      });
      x += width;
    });
    doc.restore();
    return y + headerHeight;
  };

  const measureRowHeight = (row) => {
    doc.font('Helvetica').fontSize(fontSize);
    let max = minRowHeight;
    columns.forEach((col, i) => {
      let value = cellText(row[col.key]);
      if (col.key === 'floor') value = normalizeFloor(value);
      if (isStatusColumn(col)) value = formatStatusLabel(value);
      const height = doc.heightOfString(value || ' ', {
        width: Math.max(colWidths[i] - padX * 2, 10),
      });
      max = Math.max(max, height + padY * 2);
    });
    return max;
  };

  const drawStatusPill = (label, x, y, width) => {
    const key = String(label || '')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '_');
    const colors = STATUS_COLORS[key] || { bg: '#e2e8f0', fg: '#334155' };
    const text = formatStatusLabel(label);
    const pillHeight = 14;
    doc.font('Helvetica-Bold').fontSize(7);
    const textWidth = Math.min(doc.widthOfString(text) + 10, Math.max(width - 4, 24));
    const pillX = x + 2;
    const pillY = y + 2;

    doc.save();
    doc.roundedRect(pillX, pillY, textWidth, pillHeight, 3).fill(colors.bg);
    doc.fillColor(colors.fg);
    doc.text(text, pillX + 5, pillY + 3.5, {
      width: textWidth - 8,
      lineBreak: false,
      ellipsis: true,
    });
    doc.restore();
  };

  const drawRow = (row, y, zebra) => {
    const rowHeight = measureRowHeight(row);

    doc.save();
    if (zebra) {
      doc.rect(startX, y, contentWidth, rowHeight).fill(BRAND.zebra);
    } else {
      doc.rect(startX, y, contentWidth, rowHeight).fill(BRAND.surface);
    }
    doc.restore();

    let x = startX;
    columns.forEach((col, i) => {
      const width = colWidths[i];
      let value = cellText(row[col.key]);
      if (col.key === 'floor') value = normalizeFloor(value);

      if (isStatusColumn(col) && value) {
        drawStatusPill(value, x, y + (rowHeight - 18) / 2, width);
      } else {
        const align = isAmountColumn(col) ? 'right' : 'left';
        const isSection = col.key === 'section';
        doc
          .font(isSection ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(fontSize)
          .fillColor(isAmountColumn(col) ? BRAND.amount : BRAND.ink);
        doc.text(value, x + padX, y + padY, {
          width: width - padX * 2,
          align,
          height: rowHeight - padY * 2,
          ellipsis: true,
        });
      }
      x += width;
    });

    doc
      .strokeColor(BRAND.rowLine)
      .lineWidth(0.5)
      .moveTo(startX, y + rowHeight)
      .lineTo(startX + contentWidth, y + rowHeight)
      .stroke();

    return y + rowHeight;
  };

  drawPageChrome();

  let y = 68;
  doc.fillColor(BRAND.ink).font('Helvetica-Bold').fontSize(13);
  doc.text(title, startX, y, { width: contentWidth });
  y = doc.y + 4;

  if (options.subtitle) {
    doc.font('Helvetica').fontSize(9).fillColor(BRAND.muted);
    doc.text(options.subtitle, startX, y, { width: contentWidth });
    y = doc.y + 2;
  }

  doc.font('Helvetica').fontSize(8).fillColor(BRAND.muted);
  doc.text(`Generated ${new Date().toLocaleString()} · ${rows.length} rows`, startX, y, {
    width: contentWidth,
  });
  y = doc.y + tableTopGap;

  y = drawTableHeader(y);

  if (!rows.length) {
    doc.font('Helvetica').fontSize(10).fillColor(BRAND.muted);
    doc.text('No data for this filter.', startX, y + 16, { width: contentWidth });
  } else {
    rows.forEach((row, index) => {
      const needed = measureRowHeight(row);
      if (y + needed > pageHeight - 48) {
        doc.addPage();
        drawPageChrome();
        y = 68;
        y = drawTableHeader(y);
      }
      y = drawRow(row, y, index % 2 === 1);
    });
  }

  const pageCount = doc.bufferedPageRange().count;
  for (let i = 0; i < pageCount; i += 1) {
    doc.switchToPage(i);
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(BRAND.muted)
      .text(`Page ${i + 1} of ${pageCount}`, margin, pageHeight - 28, {
        width: contentWidth,
        align: 'right',
        lineBreak: false,
      });
  }

  doc.end();
}

export default { exportExcel, exportPdf };
