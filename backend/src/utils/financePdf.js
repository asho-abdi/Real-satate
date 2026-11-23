import { fileURLToPath } from 'node:url';
import PDFDocument from 'pdfkit';
import { BRAND as RJK, footers, label, letterhead, pdfText } from './pdfBrand.js';
import { DEFAULT_USD_KES_RATE, formatMoney } from './currency.js';

const BRAND = {
  navy: '#1a4a6e',
  ink: '#243447',
  muted: '#5c6f84',
  border: '#dce4ee',
  soft: '#eef3f8',
};

function money(n, currency = 'KES', company = {}) {
  return formatMoney(n, {
    currency,
    dual: true,
    usdKesRate: company.usdKesRate ?? DEFAULT_USD_KES_RATE,
  });
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
 * Proforma-style A4 invoice / receipt (HODO-style layout, RJK branding).
 * Bill-to shows name/phone/unit only — no long thank-you paragraph.
 */
function streamFinanceA4Pdf(res, docMeta, company = {}) {
  const isReceipt = docMeta.type === 'RECEIPT';
  const title = isReceipt ? 'Receipt#' : 'Invoice #';
  const companyName = prettyCompany(company.companyName || company['app.name']);
  const currency = company.currency || 'KES';
  const kes = (v) =>
    `${currency} ${Number(v || 0).toLocaleString('en-KE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  const fmt = (v) => money(v, currency, company);

  const filename = `${docMeta.number || (isReceipt ? 'RECEIPT' : 'INVOICE')}.pdf`.replace(
    /[^\w.-]+/g,
    '_',
  );
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  const doc = new PDFDocument({
    size: 'A4',
    margin: 0,
    info: { Title: `${title} ${docMeta.number || ''}`.trim(), Author: companyName },
  });
  doc.pipe(res);

  const W = doc.page.width;
  const H = doc.page.height;
  const M = 48;
  const CW = W - M * 2;

  const charges = Number(docMeta.currentCharges ?? docMeta.amount) || 0;
  const previous = Number(docMeta.previousBalance) || 0;
  const paid = Number(docMeta.amountPaid) || 0;
  const subtotal = charges + previous;
  const balance =
    docMeta.remainingBalance != null
      ? Number(docMeta.remainingBalance) || 0
      : Math.max(0, subtotal - paid);
  const status = balance <= 0 && paid > 0 ? 'Paid' : paid > 0 ? 'Partial' : 'Unpaid';
  const st = A4.status[status];
  const depositPaid = Number(docMeta.securityDepositPaid) || 0;
  const depositHeld = Number(docMeta.securityDepositHeld ?? depositPaid) || 0;
  const depositStatus = docMeta.securityDepositStatus || (depositPaid > 0 ? 'HELD' : null);
  const nightsQty = Number(docMeta.nightsQuantity) || 0;
  const guests = Number(docMeta.guestsCount) || 0;
  const taxes = Number(docMeta.taxesAmount) || 0;
  const place = [docMeta.buildingName, docMeta.floorName].filter(Boolean).join(' · ');

  let y = 42;
  try {
    doc.image(LOGO_PATH, M, y, { width: 120 });
  } catch {
    doc.font('Helvetica-Bold').fontSize(16).fillColor(A4.navy).text(companyName, M, y + 8);
  }
  const rightX = M + CW * 0.58;
  const rightW = CW * 0.42;
  doc.font('Helvetica-Bold').fontSize(20).fillColor(A4.ink).text(title, rightX, y, {
    width: rightW,
    align: 'right',
  });
  doc
    .font('Helvetica-Bold')
    .fontSize(12)
    .fillColor(A4.ink)
    .text(docMeta.bookingCode || docMeta.number || '—', rightX, y + 28, {
      width: rightW,
      align: 'right',
    });
  doc.font('Helvetica').fontSize(9).fillColor(A4.muted).text(docMeta.number || '', rightX, y + 46, {
    width: rightW,
    align: 'right',
  });
  doc.font('Helvetica-Bold').fontSize(9).fillColor(st.fg).text(status.toUpperCase(), rightX, y + 62, {
    width: rightW,
    align: 'right',
  });

  y = 118;
  doc.font('Helvetica-Bold').fontSize(11).fillColor(A4.ink).text(companyName, M, y);
  y = doc.y + 2;
  doc.font('Helvetica').fontSize(9).fillColor(A4.muted).text('Property Management, Simplified.', M, y);
  y = doc.y + 2;
  if (docMeta.buildingName) {
    doc.text(
      String(docMeta.buildingName) + (docMeta.floorName ? `, ${docMeta.floorName}` : ''),
      M,
      y,
    );
    y = doc.y + 2;
  }
  if (company.officeMpesaNumber) {
    doc.text(`M-PESA ${company.officeMpesaNumber}`, M, y);
    y = doc.y + 2;
  }

  y += 16;
  const billW = CW * 0.55;
  const dateX = M + billW + 20;
  const dateW = CW - billW - 20;
  doc.font('Helvetica').fontSize(9).fillColor(A4.muted).text(isReceipt ? 'Received from' : 'Bill to', M, y);
  doc.font('Helvetica-Bold').fontSize(12).fillColor(A4.ink).text(docMeta.customerName || '—', M, y + 14, {
    width: billW,
  });
  let billY = doc.y + 3;
  if (docMeta.customerPhone) {
    doc.font('Helvetica').fontSize(9).fillColor(A4.muted).text(docMeta.customerPhone, M, billY, {
      width: billW,
    });
    billY = doc.y + 2;
  }
  if (docMeta.unitNumber) {
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(A4.muted)
      .text(`Unit ${docMeta.unitNumber}${place ? ` · ${place}` : ''}`, M, billY, { width: billW });
    billY = doc.y;
  }

  const dateRow = (k, v, dy) => {
    doc.font('Helvetica').fontSize(9).fillColor(A4.muted).text(k, dateX, dy, { width: dateW * 0.45 });
    doc.font('Helvetica-Bold').fontSize(9).fillColor(A4.ink).text(v, dateX + dateW * 0.45, dy, {
      width: dateW * 0.55,
      align: 'right',
    });
  };
  dateRow(isReceipt ? 'Receipt date' : 'Invoice date', longDate(docMeta.paymentDate || docMeta.createdAt), y);
  if (docMeta.dueDate) dateRow('Due date', longDate(docMeta.dueDate), y + 16);

  y = Math.max(billY, y + 40) + 22;

  const cols = [
    { key: 'desc', label: 'DESCRIPTION', x: M, w: CW * 0.34 },
    { key: 'qty', label: 'QUANTITY', x: M + CW * 0.34, w: CW * 0.14 },
    { key: 'guests', label: 'GUESTS', x: M + CW * 0.48, w: CW * 0.1 },
    { key: 'tax', label: 'TAX, KES', x: M + CW * 0.58, w: CW * 0.12 },
    { key: 'taxp', label: 'TAX, %', x: M + CW * 0.7, w: CW * 0.1 },
    { key: 'price', label: 'PRICE', x: M + CW * 0.8, w: CW * 0.2 },
  ];
  doc.rect(M, y, CW, 22).fill('#f0f2f5');
  cols.forEach((c) => {
    doc
      .font('Helvetica-Bold')
      .fontSize(7.5)
      .fillColor(A4.ink)
      .text(c.label, c.x + 4, y + 7, {
        width: c.w - 8,
        align: c.key === 'price' ? 'right' : 'left',
      });
  });
  y += 28;

  const descMain =
    docMeta.unitNumber || docMeta.description || (isReceipt ? 'Payment received' : 'Accommodation');
  const periodPretty = String(docMeta.billingPeriod || '')
    .replace(/→/g, ' - ')
    .trim();
  const timeBit = docMeta.checkInTime ? String(docMeta.checkInTime) : '';

  doc.font('Helvetica-Bold').fontSize(10).fillColor(A4.ink).text(String(descMain), cols[0].x + 4, y, {
    width: cols[0].w - 8,
  });
  let rowBottom = doc.y;
  if (timeBit || periodPretty) {
    doc
      .font('Helvetica')
      .fontSize(8.5)
      .fillColor(A4.muted)
      .text([timeBit, periodPretty].filter(Boolean).join('  ·  '), cols[0].x + 4, rowBottom + 2, {
        width: cols[0].w - 8,
      });
    rowBottom = doc.y;
  }

  const qtyLabel = nightsQty > 0 ? `${nightsQty} Nights` : '—';
  doc.font('Helvetica').fontSize(9).fillColor(A4.ink).text(qtyLabel, cols[1].x + 4, y, {
    width: cols[1].w - 8,
  });
  doc.text(guests > 0 ? String(guests) : '—', cols[2].x + 4, y, { width: cols[2].w - 8 });
  doc.text(taxes > 0 ? kes(taxes) : '', cols[3].x + 4, y, { width: cols[3].w - 8 });
  doc.text(taxes > 0 && charges > 0 ? `${((taxes / charges) * 100).toFixed(0)}%` : '', cols[4].x + 4, y, {
    width: cols[4].w - 8,
  });
  doc.font('Helvetica-Bold').fontSize(9).fillColor(A4.ink).text(kes(charges), cols[5].x + 4, y, {
    width: cols[5].w - 8,
    align: 'right',
  });

  y = Math.max(rowBottom, y + 28) + 8;
  doc.rect(M, y, CW, 0.7).fill(A4.line);
  y += 16;

  // Left: payment / deposit context · Right: clear Total → Paid → Due (same amounts as before)
  const leftW = CW * 0.48;
  const totW = CW * 0.46;
  const totX = M + CW - totW;
  let leftY = y;

  doc.font('Helvetica-Bold').fontSize(9).fillColor(A4.ink).text('Payment details', M, leftY);
  leftY += 14;
  const leftRow = (k, v, bold = false) => {
    doc.font('Helvetica').fontSize(9).fillColor(A4.muted).text(k, M, leftY, { width: leftW * 0.45 });
    doc
      .font(bold ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(9)
      .fillColor(A4.ink)
      .text(v, M + leftW * 0.45, leftY, { width: leftW * 0.55, align: 'right' });
    leftY += 13;
  };
  if (docMeta.paymentDate && paid > 0) leftRow('Payment date', longDate(docMeta.paymentDate));
  if (docMeta.method) leftRow('Method', String(docMeta.methodLabel || docMeta.method));
  if (docMeta.receivedBy) leftRow('Received by', String(docMeta.receivedBy));
  if (docMeta.bookingCode) leftRow('Booking', String(docMeta.bookingCode));
  if (docMeta.reference) leftRow('Reference', String(docMeta.reference));
  leftY += 4;
  if (depositPaid > 0) {
    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor(A4.navy)
      .text(`Security deposit paid: ${kes(depositPaid)}`, M, leftY, { width: leftW });
    leftY += 12;
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(A4.muted)
      .text(`Held: ${kes(depositHeld)} · ${depositStatus || 'HELD'} (refundable, not rent)`, M, leftY, {
        width: leftW,
      });
    leftY = doc.y + 4;
  } else {
    leftRow('Security deposit', '—');
  }

  let ty = y;
  const moneyRow = (label, value, { subtract = false, emphasis = false } = {}) => {
    doc
      .font(emphasis ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(emphasis ? 10 : 9)
      .fillColor(emphasis ? A4.ink : A4.muted)
      .text(label, totX, ty, { width: totW * 0.42 });
    doc
      .font('Helvetica-Bold')
      .fontSize(emphasis ? 11 : 9)
      .fillColor(emphasis ? (balance > 0 ? A4.navy : '#0e7a55') : A4.ink)
      .text(subtract ? `- ${kes(value)}` : kes(value), totX + totW * 0.42, ty, {
        width: totW * 0.58,
        align: 'right',
      });
    ty += emphasis ? 14 : 13;
    doc
      .font('Helvetica')
      .fontSize(7.5)
      .fillColor(A4.muted)
      .text(fmt(value), totX, ty, { width: totW, align: 'right' });
    ty += emphasis ? 16 : 14;
  };

  moneyRow('Total', subtotal);
  moneyRow('Amount paid', paid, { subtract: true });
  doc.rect(totX, ty, totW, 1.1).fill(A4.ink);
  ty += 8;
  moneyRow(balance > 0 ? 'Amount due' : 'Balance', balance, { emphasis: true });

  y = Math.max(leftY, ty) + 14;
  doc.rect(M, y, CW, 0.6).fill(A4.line);
  y += 14;

  doc.font('Helvetica-Bold').fontSize(10).fillColor(A4.ink).text('Notes', M, y);
  y += 12;
  const guestNote = [
    'Dear Guest,',
    '',
    'Thank you for choosing to stay with us at HODO SOUK. Please find attached the invoice for your recent stay with details of the charges. If you have any questions or require further clarification, feel free to contact us. We will be happy to assist you.',
    '',
    'We appreciate your business and hope to welcome you again soon.',
    '',
    'Kind regards,',
    'HODO SOUK SYRAD HOTEL & SUITES',
    'Email: infohodosouk@gmail.com',
  ].join('\n');
  doc.font('Helvetica').fontSize(8.5).fillColor(A4.muted).text(guestNote, M, y, {
    width: CW,
    lineGap: 1.5,
  });
  y = doc.y + 10;
  if (company.officeMpesaNumber) {
    doc.font('Helvetica').fontSize(9).fillColor(A4.ink).text(
      `Telephone / M-PESA: ${company.officeMpesaNumber}`,
      M,
      y,
    );
    y += 12;
  }
  if (balance > 0 && company.officeMpesaNumber) {
    doc.text(
      `Pay amount due (${kes(balance)}) to ${company.officeMpesaNumber}, quoting ${docMeta.number || 'this invoice'}.`,
      M,
      y,
      { width: CW },
    );
    y = doc.y + 8;
  }
  if (docMeta.notes) {
    // Guest-facing notes only — skip internal accrual / repair lines
    const cleanNotes = String(docMeta.notes)
      .split('\n')
      .map((line) => line.trim())
      .filter(
        (line) =>
          line &&
          !/^thank you/i.test(line) &&
          !/^dear /i.test(line) &&
          !/^nights stayed/i.test(line) &&
          !/^rate per night/i.test(line) &&
          !/^no security deposit/i.test(line) &&
          !/^security deposit paid:/i.test(line) &&
          !/^security deposit does not/i.test(line) &&
          !/^expected full stay/i.test(line) &&
          !/^future nights/i.test(line),
      )
      .join('\n')
      .trim();
    if (cleanNotes) {
      doc.font('Helvetica').fontSize(8).fillColor(A4.muted).text(cleanNotes, M, y, { width: CW });
      y = doc.y + 8;
    }
  }

  const sigY = Math.min(y + 28, H - 90);
  const sigX = W - M - 160;
  doc.rect(sigX, sigY, 160, 0.8).fill(A4.ink);
  doc.font('Helvetica').fontSize(8).fillColor(A4.muted).text('Authorised signature', sigX, sigY + 6, {
    width: 160,
    align: 'center',
  });

  const footY = H - 40;
  doc.rect(M, footY - 8, CW, 0.6).fill(A4.line);
  doc.rect(M, footY + 2, 16, 3).fill(A4.gold);
  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor(A4.muted)
    .text(`${companyName} · Property Management, Simplified.`, M + 22, footY, {
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
    line('Previous balance', money(docMeta.previousBalance, currency, company));
  }
  line('Charges', money(docMeta.currentCharges ?? docMeta.amount, currency, company));
  line('Amount paid', money(docMeta.amountPaid, currency, company), { bold: true });
  line('Balance due', money(docMeta.remainingBalance, currency, company), { bold: true });
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
  const fmt = (v) => money(v, currency, company);
  const s = statement.summary || {};
  const lines = (statement.lines || []).map((l) => ({ ...l, description: pdfText(l.description), reference: pdfText(l.reference) }));
  const rateNote = company.usdKesRate
    ? `KES with USD at ${Number(company.usdKesRate).toLocaleString('en-KE', { maximumFractionDigits: 2 })} KES/USD`
    : `Amounts in ${currency}`;

  const period =
    opts.from || opts.to
      ? `${opts.from ? longDate(opts.from) : 'Start'} – ${opts.to ? longDate(opts.to) : longDate(new Date())}`
      : 'All account activity';

  // ---------------------------------------------------------- letterhead
  let y = letterhead(doc, {
    margin,
    title: 'Statement of account',
    subtitle: period,
    metaLines: [`Statement date ${longDate(new Date())}`, rateNote],
  });

  // ---------------------------------------------------------- account holder + summary box
  const boxW = 250;
  const boxX = W - margin - boxW;
  const cust = statement.customer || {};
  label(doc, 'Account holder', margin, y);
  doc.font('Helvetica-Bold').fontSize(11).fillColor(RJK.ink).text(cust.name || '—', margin, y + 14, {
    width: boxX - margin - 20,
  });
  doc.font('Helvetica').fontSize(9).fillColor(RJK.muted);
  if (cust.phone) doc.text(cust.phone, margin, doc.y + 3, { width: boxX - margin - 20 });
  if (statement.unit?.roomNumber) doc.text(`Unit ${statement.unit.roomNumber}`, margin, doc.y + 2);
  const place = [statement.unit?.building?.name, statement.unit?.floor?.name].filter(Boolean).join(' · ');
  if (place) doc.text(place, margin, doc.y + 2, { width: boxX - margin - 20 });
  if (cust.leaseStart) {
    doc.text(`Lease commencement ${longDate(cust.leaseStart)}`, margin, doc.y + 4, {
      width: boxX - margin - 20,
    });
  }
  if (cust.registeredAt) {
    doc.text(`Registered ${longDate(cust.registeredAt)}`, margin, doc.y + 2, {
      width: boxX - margin - 20,
    });
  }
  if (cust.monthlyRent != null && Number(cust.monthlyRent) > 0) {
    doc.text(`Monthly rent ${fmt(cust.monthlyRent)}`, margin, doc.y + 2, {
      width: boxX - margin - 20,
    });
  }
  if (Number(cust.rentFreeMonths) > 0) {
    doc.text(
      `Rent-free: first ${Number(cust.rentFreeMonths)} month${Number(cust.rentFreeMonths) === 1 ? '' : 's'}`,
      margin,
      doc.y + 2,
      { width: boxX - margin - 20 },
    );
  }
  if (cust.leaseEnd) {
    doc.text(`Lease end ${longDate(cust.leaseEnd)}`, margin, doc.y + 2, {
      width: boxX - margin - 20,
    });
  }
  const leftEnd = doc.y;

  const closing = Number(s.closingBalance ?? s.outstandingBalance ?? 0);
  const rows = [
    ['Opening balance', fmt(s.openingBalance)],
    ['Charges', fmt(s.totalDebit)],
    ['Payments received', `- ${fmt(s.totalCredit)}`],
  ];
  const boxH = 18 + rows.length * 22 + 48 + (Number(s.depositsHeld) > 0 || Number(s.creditBalance) > 0 ? 16 : 0);
  doc.roundedRect(boxX, y - 4, boxW, boxH, 6).lineWidth(0.7).strokeColor(RJK.line).stroke();
  let by = y + 8;
  label(doc, 'Account summary', boxX + 12, by);
  by += 16;
  rows.forEach(([k, v]) => {
    doc.font('Helvetica').fontSize(8).fillColor(RJK.muted).text(k, boxX + 12, by, { width: boxW - 24 });
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(RJK.ink).text(v, boxX + 12, by + 10, { width: boxW - 24, align: 'right' });
    by += 22;
  });
  doc.rect(boxX + 12, by + 2, boxW - 24, 1).fill(RJK.ink);
  by += 10;
  doc.font('Helvetica-Bold').fontSize(9).fillColor(RJK.ink).text(closing > 0 ? 'Balance due' : 'Closing balance', boxX + 12, by + 3, { width: boxW - 24 });
  doc
    .font('Helvetica-Bold')
    .fontSize(9)
    .fillColor(closing > 0 ? RJK.navy : RJK.green)
    .text(fmt(closing), boxX + 12, by + 14, { width: boxW - 24, align: 'right' });
  by += 28;
  if (Number(s.creditBalance) > 0) {
    doc.font('Helvetica').fontSize(7.5).fillColor(RJK.green).text(`Credit: ${fmt(s.creditBalance)}`, boxX + 12, by, { width: boxW - 24, align: 'right' });
    by += 12;
  } else if (Number(s.depositsHeld) > 0) {
    doc.font('Helvetica').fontSize(7.5).fillColor(RJK.muted).text(`Deposit held: ${fmt(s.depositsHeld)}`, boxX + 12, by, { width: boxW - 24, align: 'right' });
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
    .fontSize(11)
    .fillColor(closing > 0 ? RJK.navy : RJK.green)
    .text(fmt(closing), margin, y, { width: CW, align: 'right' });
  footers(doc, { margin, companyName });
  doc.end();
}
