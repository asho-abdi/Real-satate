import { fileURLToPath } from 'node:url';
import PDFDocument from 'pdfkit';
import { BRAND as RJK, footers, label, letterhead, pdfText } from './pdfBrand.js';

const BRAND = {
  navy: '#1a4a6e',
  ink: '#243447',
  muted: '#5c6f84',
  border: '#dce4ee',
  soft: '#eef3f8',
};

function money(n, currency = 'KES') {
  const v = Number(n || 0);
  return `${currency} ${v.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function dateStr(v) {
  if (!v) return '—';
  return String(v).slice(0, 10);
}

/**
 * Stream an invoice/receipt PDF.
 * Default is a branded A4 document; pass { format: 'slip' } for ~80mm thermal paper.
 */
export function streamFinanceDocumentPdf(res, rawMeta, company = {}, opts = {}) {
  const docMeta = Object.fromEntries(Object.entries(rawMeta || {}).map(([k, v]) => [k, typeof v === 'string' ? pdfText(v) : v]));
  if (opts.format === 'slip') return streamFinanceSlipPdf(res, docMeta, company);
  return streamFinanceA4Pdf(res, docMeta, company);
}

/* ------------------------------------------------------------------ A4 */

const A4 = {
  navy: '#002b50',
  ink: '#0f1e33',
  muted: '#64748b',
  line: '#e3e8ef',
  gold: '#f5a900',
  status: {
    Paid: { fg: '#0e7a55', bg: '#e9f7f1', border: '#bfe6d5' },
    Partial: { fg: '#9a6400', bg: '#fff6e0', border: '#f5dca0' },
    Unpaid: { fg: '#b4232f', bg: '#fdeeee', border: '#f4c7cb' },
  },
};

const LOGO_PATH = fileURLToPath(new URL('../assets/brand/rjk-logo.png', import.meta.url));

function prettyCompany(name) {
  if (!name) return 'RJK Realty';
  return name === name.toUpperCase() ? name.replace(/\bREALTY\b/, 'Realty') : name;
}

function longDate(v) {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Branded A4 invoice / receipt: logo, one navy rule, a clean item table and totals.
 * Deliberately plain — white page, no gradients or decoration.
 */
function streamFinanceA4Pdf(res, docMeta, company = {}) {
  const isReceipt = docMeta.type === 'RECEIPT';
  const title = isReceipt ? 'RECEIPT' : 'INVOICE';
  const companyName = prettyCompany(company.companyName || company['app.name']);
  const currency = company.currency || 'KES';
  const fmt = (v) => money(v, currency);

  const filename = `${docMeta.number || title}.pdf`.replace(/[^\w.-]+/g, '_');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  const doc = new PDFDocument({ size: 'A4', margin: 0, info: { Title: `${title} ${docMeta.number || ''}`.trim(), Author: companyName } });
  doc.pipe(res);

  const W = doc.page.width; // 595.28
  const H = doc.page.height; // 841.89
  const M = 51; // ~18mm
  const CW = W - M * 2;

  const charges = Number(docMeta.currentCharges ?? docMeta.amount) || 0;
  const previous = Number(docMeta.previousBalance) || 0;
  const paid = Number(docMeta.amountPaid) || 0;
  const subtotal = charges + previous;
  const balance = docMeta.remainingBalance != null ? Number(docMeta.remainingBalance) || 0 : Math.max(0, subtotal - paid);
  const status = balance <= 0 && paid > 0 ? 'Paid' : paid > 0 ? 'Partial' : 'Unpaid';

  const label = (text, x, y, opts = {}) =>
    doc.font('Helvetica-Bold').fontSize(7).fillColor(A4.muted).text(text.toUpperCase(), x, y, { characterSpacing: 1, ...opts });

  // ---------------------------------------------------------- header
  let y = 46;
  try {
    doc.image(LOGO_PATH, M, y, { width: 148 });
  } catch {
    doc.font('Helvetica-Bold').fontSize(18).fillColor(A4.navy).text(companyName, M, y + 20);
  }
  doc.font('Helvetica-Bold').fontSize(26).fillColor(A4.navy).text(title, M, y + 4, { width: CW, align: 'right', characterSpacing: 1 });
  doc.font('Helvetica').fontSize(9).fillColor(A4.muted).text(docMeta.number || '—', M, y + 36, { width: CW, align: 'right' });

  const st = A4.status[status];
  doc.font('Helvetica-Bold').fontSize(7.5);
  const pillW = doc.widthOfString(status.toUpperCase(), { characterSpacing: 0.8 }) + 16;
  const pillX = W - M - pillW;
  doc.roundedRect(pillX, y + 52, pillW, 16, 3).fillAndStroke(st.bg, st.border);
  doc.fillColor(st.fg).text(status.toUpperCase(), pillX, y + 56.5, { width: pillW, align: 'center', characterSpacing: 0.8 });

  y = 140;
  doc.rect(M, y, CW, 1.2).fill(A4.navy);

  // ---------------------------------------------------------- parties + dates
  y += 22;
  const colW = (CW - 40) / 3;
  const c1 = M;
  const c2 = M + colW + 20;
  const c3 = M + (colW + 20) * 2;

  label('From', c1, y);
  doc.font('Helvetica-Bold').fontSize(9.5).fillColor(A4.ink).text(companyName, c1, y + 14, { width: colW });
  doc.font('Helvetica').fontSize(9).fillColor(A4.muted).text('Property Management', c1, doc.y + 2, { width: colW });
  if (company.officeMpesaNumber) doc.text(`M-PESA ${company.officeMpesaNumber}`, c1, doc.y + 2, { width: colW });
  const yFromEnd = doc.y;

  label(isReceipt ? 'Received from' : 'Billed to', c2, y);
  doc.font('Helvetica-Bold').fontSize(9.5).fillColor(A4.ink).text(docMeta.customerName || '—', c2, y + 14, { width: colW });
  doc.font('Helvetica').fontSize(9).fillColor(A4.muted);
  if (docMeta.customerPhone) doc.text(docMeta.customerPhone, c2, doc.y + 2, { width: colW });
  if (docMeta.unitNumber) doc.text(`Unit ${docMeta.unitNumber}`, c2, doc.y + 2, { width: colW });
  const place = [docMeta.buildingName, docMeta.floorName].filter(Boolean).join(' · ');
  if (place) doc.text(place, c2, doc.y + 2, { width: colW });
  const yBillEnd = doc.y;

  const metaRow = (k, v, ry) => {
    doc.font('Helvetica').fontSize(9).fillColor(A4.muted).text(k, c3, ry, { width: colW });
    doc.font('Helvetica-Bold').fillColor(A4.ink).text(v, c3, ry, { width: colW, align: 'right' });
  };
  let ry = y;
  metaRow(isReceipt ? 'Receipt date' : 'Issue date', longDate(docMeta.paymentDate || docMeta.createdAt), ry);
  ry += 15;
  if (docMeta.dueDate) {
    metaRow('Due date', longDate(docMeta.dueDate), ry);
    ry += 15;
  }
  metaRow('Currency', currency, ry);
  ry += 15;

  // ---------------------------------------------------------- items
  y = Math.max(yFromEnd, yBillEnd, ry) + 28;
  const colNo = M;
  const colDesc = M + 34;
  const colPeriod = M + CW * 0.56;
  const colAmt = M + CW * 0.76;
  const amtW = CW * 0.24;

  doc.font('Helvetica-Bold').fontSize(7).fillColor(A4.muted);
  doc.text('#', colNo, y, { characterSpacing: 1 });
  doc.text('DESCRIPTION', colDesc, y, { characterSpacing: 1 });
  doc.text('PERIOD', colPeriod, y, { characterSpacing: 1 });
  doc.text('AMOUNT', colAmt, y, { width: amtW, align: 'right', characterSpacing: 1 });
  y += 13;
  doc.rect(M, y, CW, 1).fill(A4.ink);
  y += 10;

  const unitText = [docMeta.unitNumber ? `Unit ${docMeta.unitNumber}` : null, place || null].filter(Boolean).join(' · ');
  const items = [
    {
      desc: docMeta.description || (isReceipt ? 'Payment received' : 'Charges'),
      detail: unitText,
      period: docMeta.billingPeriod || '—',
      amount: charges,
    },
  ];
  if (previous > 0) items.push({ desc: 'Previous balance brought forward', detail: '', period: '—', amount: previous });

  items.forEach((it, i) => {
    const descW = colPeriod - colDesc - 12;
    doc.font('Helvetica').fontSize(9).fillColor(A4.muted).text(String(i + 1).padStart(2, '0'), colNo, y);
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(A4.ink).text(it.desc, colDesc, y, { width: descW });
    let rowEnd = doc.y;
    if (it.detail) {
      doc.font('Helvetica').fontSize(8.5).fillColor(A4.muted).text(it.detail, colDesc, rowEnd + 1, { width: descW });
      rowEnd = doc.y;
    }
    doc.font('Helvetica').fontSize(9).fillColor(A4.muted).text(it.period, colPeriod, y, { width: colAmt - colPeriod - 8 });
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(A4.ink).text(fmt(it.amount), colAmt, y, { width: amtW, align: 'right' });
    y = Math.max(rowEnd, doc.y) + 10;
    doc.rect(M, y, CW, 0.7).fill(A4.line);
    y += 10;
  });

  // ---------------------------------------------------------- payment details + totals
  y += 8;
  const totX = M + CW - 210;
  const totW = 210;
  const leftW = totX - M - 30;

  label('Payment details', M, y);
  let ly = y + 15;
  const detail = (k, v) => {
    doc.font('Helvetica').fontSize(9).fillColor(A4.muted).text(k, M, ly, { width: leftW });
    doc.font('Helvetica-Bold').fillColor(A4.ink).text(v, M, ly, { width: leftW, align: 'right' });
    ly += 15;
  };
  detail('Payment date', docMeta.paymentDate && paid > 0 ? longDate(docMeta.paymentDate) : 'Not yet paid');
  if (docMeta.method) detail('Method', String(docMeta.methodLabel || docMeta.method));
  if (docMeta.reference) detail('Reference', String(docMeta.reference));
  if (docMeta.receivedBy) detail('Received by', String(docMeta.receivedBy));
  if (balance > 0 && company.officeMpesaNumber) {
    ly += 4;
    doc.font('Helvetica').fontSize(8.5).fillColor(A4.muted).text(
      `Pay the balance by M-PESA to ${company.officeMpesaNumber}, quoting ${docMeta.number || 'this invoice number'}.`,
      M,
      ly,
      { width: leftW },
    );
    ly = doc.y;
  }

  let ty = y;
  const total = (k, v, bold) => {
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9).fillColor(bold ? A4.ink : A4.muted).text(k, totX, ty, { width: totW });
    doc.font('Helvetica-Bold').fillColor(A4.ink).text(v, totX, ty, { width: totW, align: 'right' });
    ty += 16;
  };
  total('Subtotal', fmt(subtotal));
  total('Amount paid', `- ${fmt(paid)}`);
  ty += 2;
  doc.rect(totX, ty, totW, 1.2).fill(A4.ink);
  ty += 9;
  doc.font('Helvetica-Bold').fontSize(10).fillColor(A4.ink).text('Balance due', totX, ty + 3, { width: totW });
  doc.font('Helvetica-Bold').fontSize(15).fillColor(balance > 0 ? A4.navy : '#0e7a55').text(fmt(balance), totX, ty, { width: totW, align: 'right' });
  ty += 24;

  y = Math.max(ly, ty) + 18;

  if (docMeta.notes) {
    label('Notes', M, y);
    doc.font('Helvetica').fontSize(9).fillColor(A4.muted).text(String(docMeta.notes), M, y + 14, { width: CW });
    y = doc.y + 10;
  }

  // ---------------------------------------------------------- signature + footer (pinned to bottom)
  const footY = H - 46;
  const sigY = footY - 52;
  doc.font('Helvetica').fontSize(9).fillColor(A4.muted).text(
    balance > 0
      ? 'Please settle the balance due by the due date. Thank you for your business.'
      : 'Thank you for your payment. Please keep this document for your records.',
    M,
    sigY - 2,
    { width: CW * 0.55 },
  );
  const sigX = W - M - 170;
  doc.rect(sigX, sigY + 8, 170, 0.8).fill(A4.ink);
  doc.font('Helvetica').fontSize(8).fillColor(A4.muted).text('Authorised signature', sigX, sigY + 13, { width: 170, align: 'center' });

  doc.rect(M, footY - 10, CW, 0.7).fill(A4.line);
  doc.rect(M, footY + 2.5, 17, 3.2).fill(A4.gold);
  doc.font('Helvetica').fontSize(8).fillColor(A4.muted).text(`${companyName} · Property Management, Simplified.`, M + 24, footY, {
    width: CW * 0.7,
    lineBreak: false,
  });
  doc.text(docMeta.number || '', M, footY, { width: CW, align: 'right', lineBreak: false });

  doc.end();
}

/* ------------------------------------------------------------------ 80mm slip */

function streamFinanceSlipPdf(res, docMeta, company = {}) {
  const isReceipt = docMeta.type === 'RECEIPT';
  const title = isReceipt ? 'PAYMENT RECEIPT' : 'INVOICE';
  const companyName = company.companyName || company['app.name'] || 'RJK REALTY';
  const currency = company.currency || 'KES';

  const filename = `${docMeta.number || title}.pdf`.replace(/[^\w.-]+/g, '_');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  // ~80mm wide slip (thermal / small paper). Tall enough for typical booking invoice.
  const pageW = 226.77; // 80mm
  const pageH = 480;
  const m = 14;
  const contentW = pageW - m * 2;

  const doc = new PDFDocument({
    size: [pageW, pageH],
    margin: m,
  });
  doc.pipe(res);

  let y = m;

  doc.fillColor(BRAND.navy).fontSize(11).font('Helvetica-Bold').text(companyName, m, y, {
    width: contentW,
    align: 'center',
  });
  y += 14;
  doc.fillColor(BRAND.ink).fontSize(9).font('Helvetica-Bold').text(title, m, y, {
    width: contentW,
    align: 'center',
  });
  y += 12;
  doc
    .moveTo(m, y)
    .lineTo(pageW - m, y)
    .strokeColor(BRAND.border)
    .lineWidth(0.8)
    .stroke();
  y += 10;

  const line = (label, value, opts = {}) => {
    const labelW = 78;
    doc.font('Helvetica').fontSize(7).fillColor(BRAND.muted).text(label, m, y, { width: labelW });
    doc
      .font(opts.bold ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(opts.bold ? 8 : 7)
      .fillColor(BRAND.ink)
      .text(String(value ?? '—'), m + labelW, y, { width: contentW - labelW, align: 'right' });
    y += opts.tall ? 14 : 11;
  };

  line(isReceipt ? 'Receipt No.' : 'Invoice No.', docMeta.number || '—', { bold: true });
  line('Date', dateStr(docMeta.paymentDate || docMeta.createdAt));
  line('Customer', docMeta.customerName || '—', { bold: true });
  if (docMeta.customerPhone) line('Phone', docMeta.customerPhone);

  const loc = [
    docMeta.buildingName,
    docMeta.floorName,
    docMeta.unitNumber ? `Unit ${docMeta.unitNumber}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  if (loc) line('Property', loc, { tall: true });

  y += 2;
  doc
    .moveTo(m, y)
    .lineTo(pageW - m, y)
    .strokeColor(BRAND.border)
    .stroke();
  y += 8;

  if (docMeta.description) {
    doc.font('Helvetica-Bold').fontSize(7).fillColor(BRAND.ink).text('Description', m, y);
    y += 10;
    const descH = doc.heightOfString(docMeta.description, { width: contentW, fontSize: 7 });
    doc.font('Helvetica').fontSize(7).fillColor(BRAND.muted).text(docMeta.description, m, y, {
      width: contentW,
    });
    y += Math.max(12, descH + 4);
  }

  line('Period', docMeta.billingPeriod || '—');
  if (Number(docMeta.previousBalance) > 0) {
    line('Previous balance', money(docMeta.previousBalance, currency));
  }
  line('Charges', money(docMeta.currentCharges ?? docMeta.amount, currency));
  line('Amount paid', money(docMeta.amountPaid, currency), { bold: true });
  line('Balance due', money(docMeta.remainingBalance, currency), { bold: true });
  if (docMeta.method) line('Method', String(docMeta.methodLabel || docMeta.method));
  if (docMeta.reference) line('Reference', docMeta.reference);
  if (docMeta.receivedBy) line('Received by', docMeta.receivedBy);
  if (docMeta.dueDate) line('Due date', dateStr(docMeta.dueDate));

  if (docMeta.notes) {
    y += 4;
    doc.font('Helvetica-Bold').fontSize(7).fillColor(BRAND.ink).text('Notes', m, y);
    y += 10;
    doc.font('Helvetica').fontSize(7).fillColor(BRAND.muted).text(String(docMeta.notes), m, y, {
      width: contentW,
    });
    y += 16;
  }

  y += 6;
  doc
    .moveTo(m, y)
    .lineTo(pageW - m, y)
    .strokeColor(BRAND.border)
    .stroke();
  y += 8;
  doc
    .fillColor(BRAND.muted)
    .fontSize(6)
    .font('Helvetica')
    .text('Thank you · RJK Realty', m, y, { width: contentW, align: 'center' });

  doc.end();
}

/**
 * Stream a tenant/customer statement PDF.
 */
export function streamStatementPdf(res, statement, company = {}, opts = {}) {
  const companyName = prettyCompany(company.companyName || company['app.name']);
  const currency = company.currency || 'KES';
  const filename = `Statement-${(statement.customer?.name || 'customer').replace(/[^\w.-]+/g, '_')}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  const margin = 46;
  const doc = new PDFDocument({
    size: 'A4',
    margin,
    bufferPages: true,
    info: { Title: `Statement of account · ${statement.customer?.name || ''}`.trim(), Author: companyName },
  });
  doc.pipe(res);

  const W = doc.page.width;
  const CW = W - margin * 2;
  const bottomLimit = doc.page.height - 60;
  const amount = (v) => Number(v || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const s = statement.summary || {};
  const lines = (statement.lines || []).map((l) => ({ ...l, description: pdfText(l.description), reference: pdfText(l.reference) }));

  const period =
    opts.from || opts.to
      ? `${opts.from ? longDate(opts.from) : 'Start'} – ${opts.to ? longDate(opts.to) : longDate(new Date())}`
      : 'All account activity';

  // ---------------------------------------------------------- letterhead
  let y = letterhead(doc, {
    margin,
    title: 'Statement of account',
    subtitle: period,
    metaLines: [`Statement date ${longDate(new Date())}`, `Amounts in ${currency}`],
  });

  // ---------------------------------------------------------- account holder + summary box
  const boxW = 230;
  const boxX = W - margin - boxW;
  label(doc, 'Account holder', margin, y);
  doc.font('Helvetica-Bold').fontSize(11).fillColor(RJK.ink).text(statement.customer?.name || '—', margin, y + 14, { width: boxX - margin - 20 });
  doc.font('Helvetica').fontSize(9).fillColor(RJK.muted);
  if (statement.customer?.phone) doc.text(statement.customer.phone, margin, doc.y + 3, { width: boxX - margin - 20 });
  if (statement.unit?.roomNumber) doc.text(`Unit ${statement.unit.roomNumber}`, margin, doc.y + 2);
  const place = [statement.unit?.building?.name, statement.unit?.floor?.name].filter(Boolean).join(' · ');
  if (place) doc.text(place, margin, doc.y + 2, { width: boxX - margin - 20 });
  const leftEnd = doc.y;

  const closing = Number(s.closingBalance ?? s.outstandingBalance ?? 0);
  const rows = [
    ['Opening balance', amount(s.openingBalance)],
    ['Charges', amount(s.totalDebit)],
    ['Payments received', `- ${amount(s.totalCredit)}`],
  ];
  const boxH = 18 + rows.length * 15 + 40 + (Number(s.depositsHeld) > 0 || Number(s.creditBalance) > 0 ? 16 : 0);
  doc.roundedRect(boxX, y - 4, boxW, boxH, 6).lineWidth(0.7).strokeColor(RJK.line).stroke();
  let by = y + 8;
  label(doc, 'Account summary', boxX + 12, by);
  by += 16;
  rows.forEach(([k, v]) => {
    doc.font('Helvetica').fontSize(9).fillColor(RJK.muted).text(k, boxX + 12, by, { width: boxW - 24 });
    doc.font('Helvetica-Bold').fillColor(RJK.ink).text(v, boxX + 12, by, { width: boxW - 24, align: 'right' });
    by += 15;
  });
  doc.rect(boxX + 12, by + 2, boxW - 24, 1).fill(RJK.ink);
  by += 10;
  doc.font('Helvetica-Bold').fontSize(9.5).fillColor(RJK.ink).text(closing > 0 ? 'Balance due' : 'Closing balance', boxX + 12, by + 3, { width: boxW - 24 });
  doc
    .font('Helvetica-Bold')
    .fontSize(14)
    .fillColor(closing > 0 ? RJK.navy : RJK.green)
    .text(`${currency} ${amount(closing)}`, boxX + 12, by, { width: boxW - 24, align: 'right' });
  by += 22;
  if (Number(s.creditBalance) > 0) {
    doc.font('Helvetica').fontSize(8).fillColor(RJK.green).text(`Credit available: ${currency} ${amount(s.creditBalance)}`, boxX + 12, by, { width: boxW - 24, align: 'right' });
    by += 12;
  } else if (Number(s.depositsHeld) > 0) {
    doc.font('Helvetica').fontSize(8).fillColor(RJK.muted).text(`Deposit held: ${currency} ${amount(s.depositsHeld)}`, boxX + 12, by, { width: boxW - 24, align: 'right' });
    by += 12;
  }

  y = Math.max(leftEnd, y - 4 + boxH) + 26;

  // ---------------------------------------------------------- transactions
  const cols = [
    { key: 'date', h: 'Date', w: 72 },
    { key: 'description', h: 'Description', w: CW - 72 - 84 * 3 },
    { key: 'debit', h: 'Charges', w: 84, right: true },
    { key: 'credit', h: 'Payments', w: 84, right: true },
    { key: 'balance', h: 'Balance', w: 84, right: true },
  ];
  const headerRow = (hy) => {
    let x = margin;
    cols.forEach((c) => {
      label(doc, c.h, x + 4, hy, { width: c.w - 8, align: c.right ? 'right' : 'left' });
      x += c.w;
    });
    doc.rect(margin, hy + 13, CW, 1).fill(RJK.ink);
    return hy + 19;
  };

  label(doc, `Transactions · ${lines.filter((l) => !l.isOpening).length}`, margin, y, { color: RJK.navy, size: 8 });
  y += 18;
  y = headerRow(y);

  if (!lines.length) {
    doc.font('Helvetica').fontSize(9).fillColor(RJK.muted).text('No transactions in this period.', margin, y + 14, { width: CW, align: 'center' });
    y += 40;
  }

  lines.forEach((line, i) => {
    const sub = [line.method, line.reference].filter(Boolean).join(' · ');
    doc.font('Helvetica').fontSize(8.8);
    const descH = doc.heightOfString(line.description || '—', { width: cols[1].w - 8 }) + (sub ? 11 : 0);
    const h = Math.max(22, descH + 10);
    if (y + h > bottomLimit) {
      doc.addPage();
      y = letterhead(doc, { margin, title: 'Statement of account', subtitle: statement.customer?.name, compact: true });
      y = headerRow(y);
    }
    if (line.isOpening) doc.rect(margin, y, CW, h).fill(RJK.soft);
    else if (i % 2 === 1) doc.rect(margin, y, CW, h).fill(RJK.zebra);

    let x = margin;
    doc.font('Helvetica').fontSize(8.8).fillColor('#334155').text(longDate(line.date), x + 4, y + 6, { width: cols[0].w - 8 });
    x += cols[0].w;
    doc
      .font(line.isOpening ? 'Helvetica-Oblique' : 'Helvetica-Bold')
      .fontSize(8.8)
      .fillColor(RJK.ink)
      .text(line.description || '—', x + 4, y + 6, { width: cols[1].w - 8 });
    if (sub) doc.font('Helvetica').fontSize(7.5).fillColor(RJK.muted).text(sub, x + 4, doc.y + 1, { width: cols[1].w - 8, lineBreak: false, ellipsis: true });
    x += cols[1].w;
    doc.font('Helvetica').fontSize(8.8).fillColor(RJK.ink).text(line.debit ? amount(line.debit) : '—', x + 4, y + 6, { width: cols[2].w - 8, align: 'right' });
    x += cols[2].w;
    doc.fillColor(line.credit ? RJK.green : RJK.muted).text(line.credit ? amount(line.credit) : '—', x + 4, y + 6, { width: cols[3].w - 8, align: 'right' });
    x += cols[3].w;
    doc.font('Helvetica-Bold').fillColor(RJK.ink).text(amount(line.balance), x + 4, y + 6, { width: cols[4].w - 8, align: 'right' });
    y += h;
    doc.rect(margin, y, CW, 0.5).fill(RJK.line);
  });

  // ---------------------------------------------------------- closing line
  if (y + 60 > bottomLimit) {
    doc.addPage();
    y = letterhead(doc, { margin, title: 'Statement of account', subtitle: statement.customer?.name, compact: true });
  }
  y += 14;
  doc.font('Helvetica-Bold').fontSize(10).fillColor(RJK.ink).text(closing > 0 ? 'Balance due' : 'Closing balance', margin, y + 2, { width: CW - 180, align: 'right' });
  doc
    .font('Helvetica-Bold')
    .fontSize(13)
    .fillColor(closing > 0 ? RJK.navy : RJK.green)
    .text(`${currency} ${amount(closing)}`, margin, y, { width: CW, align: 'right' });
  y += 26;
  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor(RJK.muted)
    .text(
      'Security deposits are held on your behalf and are not counted as rent payments. Please contact our office if anything on this statement looks incorrect.',
      margin,
      y,
      { width: CW },
    );

  footers(doc, { margin, companyName });
  doc.end();
}
