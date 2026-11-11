import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import {
  BRAND,
  footers,
  generatedStamp,
  kpiBand,
  label,
  letterhead,
  prettyCompany,
  statusPill,
  titleCase,
  pdfText,
} from './pdfBrand.js';

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
  return pdfText(value);
}

function normalizeFloor(value) {
  const raw = cellText(value);
  if (!raw || raw === '—') return raw;
  return raw.replace(/^(Floor)(\d+)/i, '$1 $2');
}

function isAmountColumn(col) {
  const key = String(col.key || '').toLowerCase();
  const header = String(col.header || '').toLowerCase();
  return (
    key.includes('amount') ||
    key.includes('balance') ||
    key.includes('rent') ||
    key.includes('total') ||
    header.includes('amount')
  );
}

function isStatusColumn(col) {
  const key = String(col.key || '').toLowerCase();
  return key === 'status' || key.endsWith('status');
}

function toNumber(value) {
  if (typeof value === 'number') return value;
  const n = Number(String(value ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function formatAmount(value) {
  if (value === '' || value == null || value === '—') return '—';
  const n = toNumber(value);
  return n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Stream a branded A4 PDF table.
 * @param {import('express').Response} res
 * @param {string} filename
 * @param {string} title
 * @param {{ header: string, key: string, width?: number }[]} columns
 * @param {Record<string, unknown>[]} rows
 * @param {{ subtitle?: string, companyName?: string, currency?: string,
 *           kpis?: { label: string, value: string, accent?: boolean, color?: string }[],
 *           groupBy?: string }=} options
 *   Rows are grouped under headings when a `section` column exists (or `groupBy` is given).
 */
export function exportPdf(res, filename, title, columns, rows, options = {}) {
  const safeName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);

  const companyName = prettyCompany(options.companyName);
  const currency = options.currency || 'KES';
  const groupKey = options.groupBy || (columns.some((c) => c.key === 'section') ? 'section' : null);
  const visible = columns.filter((c) => c.key !== groupKey);

  const landscape = visible.length > 6;
  const margin = 40;
  const doc = new PDFDocument({
    margin,
    size: 'A4',
    layout: landscape ? 'landscape' : 'portrait',
    bufferPages: true,
    info: { Title: title, Author: companyName },
  });
  doc.pipe(res);

  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const CW = pageWidth - margin * 2;
  const bottomLimit = pageHeight - 56;

  const weights = visible.map((c) => Math.max(c.width ?? 12, 8));
  const totalW = weights.reduce((a, b) => a + b, 0) || 1;
  const colW = weights.map((w) => (w / totalW) * CW);
  const padX = 6;
  const fontSize = 8.5;
  const amountCol = visible.find(isAmountColumn);

  const subtitle = [options.subtitle, `${rows.length} record${rows.length === 1 ? '' : 's'}`].filter(Boolean).join(' · ');

  const headerRow = (y) => {
    let x = margin;
    visible.forEach((col, i) => {
      label(doc, col.header, x + padX, y, {
        width: colW[i] - padX * 2,
        align: isAmountColumn(col) ? 'right' : 'left',
        ellipsis: true,
      });
      x += colW[i];
    });
    doc.rect(margin, y + 13, CW, 1).fill(BRAND.ink);
    return y + 19;
  };

  const rowHeight = (row) => {
    doc.font('Helvetica').fontSize(fontSize);
    let h = 20;
    visible.forEach((col, i) => {
      if (isStatusColumn(col)) return;
      let v = cellText(row[col.key]);
      if (col.key === 'floor') v = normalizeFloor(v);
      if (isAmountColumn(col)) v = formatAmount(v);
      h = Math.max(h, doc.heightOfString(v || ' ', { width: Math.max(colW[i] - padX * 2, 10) }) + 10);
    });
    return h;
  };

  const drawRow = (row, y, zebra) => {
    const h = rowHeight(row);
    if (zebra) doc.rect(margin, y, CW, h).fill(BRAND.zebra);
    let x = margin;
    visible.forEach((col, i) => {
      let v = cellText(row[col.key]);
      if (col.key === 'floor') v = normalizeFloor(v);
      if (isStatusColumn(col) && v) {
        statusPill(doc, v, x + padX, y + (h - 13) / 2, colW[i] - padX * 2);
      } else {
        const amount = isAmountColumn(col);
        const text = amount ? formatAmount(v) : col.key === 'type' ? titleCase(v) : v || '—';
        doc
          .font(amount || i === 0 ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(fontSize)
          .fillColor(amount || i === 0 ? BRAND.ink : '#334155')
          .text(text, x + padX, y + 5, {
            width: colW[i] - padX * 2,
            align: amount ? 'right' : 'left',
            height: h - 8,
            ellipsis: true,
          });
      }
      x += colW[i];
    });
    doc.rect(margin, y + h, CW, 0.5).fill(BRAND.line);
    return y + h;
  };

  const newPage = () => {
    doc.addPage();
    return letterhead(doc, { margin, title, subtitle: options.subtitle, compact: true });
  };

  // ---------------------------------------------------------- page 1
  let y = letterhead(doc, {
    margin,
    title,
    subtitle,
    metaLines: [generatedStamp(), currency ? `Amounts in ${currency}` : null],
  });

  if (Array.isArray(options.kpis) && options.kpis.length) {
    y = kpiBand(doc, { margin, y, items: options.kpis.slice(0, landscape ? 5 : 4) });
  }

  if (!rows.length) {
    doc.roundedRect(margin, y, CW, 70, 6).lineWidth(0.7).strokeColor(BRAND.line).stroke();
    doc.font('Helvetica-Bold').fontSize(10).fillColor(BRAND.ink).text('No records for this filter', margin, y + 22, { width: CW, align: 'center' });
    doc.font('Helvetica').fontSize(8.5).fillColor(BRAND.muted).text('Try a different period, building or floor.', margin, doc.y + 3, { width: CW, align: 'center' });
  } else {
    const groups = [];
    if (groupKey) {
      for (const row of rows) {
        const g = cellText(row[groupKey]) || 'Other';
        let bucket = groups.find((b) => b.name === g);
        if (!bucket) groups.push((bucket = { name: g, rows: [] }));
        bucket.rows.push(row);
      }
    } else {
      groups.push({ name: null, rows });
    }

    groups.forEach((group, gi) => {
      // Keep a group heading together with its column header and first row.
      const needed = (group.name ? 40 : 0) + 19 + rowHeight(group.rows[0]);
      if (y + needed > bottomLimit) y = newPage();
      else if (gi > 0) y += 14;

      if (group.name) {
        doc.rect(margin, y + 1, 3, 13).fill(BRAND.gold);
        doc.font('Helvetica-Bold').fontSize(11).fillColor(BRAND.navy).text(group.name, margin + 10, y, { lineBreak: false });
        const meta = [`${group.rows.length} record${group.rows.length === 1 ? '' : 's'}`];
        if (amountCol) {
          const sum = group.rows.reduce((s, r) => s + toNumber(r[amountCol.key]), 0);
          meta.push(`Total ${currency} ${formatAmount(sum)}`);
        }
        doc.font('Helvetica').fontSize(8.5).fillColor(BRAND.muted).text(meta.join(' · '), margin, y + 2, { width: CW, align: 'right' });
        y += 26;
      }

      y = headerRow(y);
      group.rows.forEach((row, ri) => {
        if (y + rowHeight(row) > bottomLimit) {
          y = newPage();
          if (group.name) {
            doc.font('Helvetica-Bold').fontSize(9).fillColor(BRAND.navy).text(`${group.name} (continued)`, margin, y);
            y += 18;
          }
          y = headerRow(y);
        }
        y = drawRow(row, y, ri % 2 === 1);
      });
    });
  }

  footers(doc, { margin, companyName });
  doc.end();
}

export default { exportExcel, exportPdf };
